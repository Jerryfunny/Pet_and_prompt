# 借鉴了 https://github.com/binary-husky/chatgpt_academic 项目

import json
import traceback
import requests
from queue import Queue
import time
from PyQt5.QtCore import QThread, pyqtSignal
from concurrent.futures import ThreadPoolExecutor


def _normalize_proxy(proxy_url):
    """将 socks5/socks5h 转为 http，避免依赖 PySocks；同 host:port 下多数代理同时支持 HTTP。"""
    if not proxy_url or not isinstance(proxy_url, str):
        return proxy_url
    p = proxy_url.strip().lower()
    if p.startswith(("socks5h://", "socks5://", "socks4a://", "socks4://")):
        rest = proxy_url.strip()[p.index("//") + 2 :]  # host:port 或 host:port/path
        return "http://" + rest
    return proxy_url.strip()

# private_config.py放自己的秘密如API和代理网址
# 读取时首先看是否存在私密的config_private配置文件（不受git管控），如果有，则覆盖原config文件
class OpenAI_request(QThread):
    response_received = pyqtSignal(str)
    tools_received = pyqtSignal(str)

    def _get(self, section, key, default=None, keys=None):
        """从 config 读取，支持多种 key 名称"""
        keys = keys or [key]
        for k in keys:
            try:
                return self.config[section][k]
            except KeyError:
                continue
        return default

    def __init__(self, config):
        super().__init__()
        self.config = config
        self.prompt_queue = Queue()

        # 基本参数（兼容不同 config 命名）
        self.api_key = self._get("OpenAI", "OPENAI_API_KEY", "", ["OPENAI_API_KEY", "openai_api_key"]) or ""
        _model = self._get("OpenAI", "LLM_MODEL", "gpt-3.5-turbo", ["LLM_MODEL", "llm_model", "1lm_model"]) or "gpt-3.5-turbo"
        self.llm_model = _model
        self.proxy = self._get("OpenAI", "PROXY", "", ["PROXY", "proxy"]) or ""
        _proxy = _normalize_proxy(self.proxy)
        self.proxies = {"http": _proxy, "https": _proxy} if _proxy else None
        self.timeout_seconds = int(self._get("OpenAI", "TIMEOUT_SECONDS", "60", ["TIMEOUT_SECONDS", "timeout_seconds"]) or 60)
        self.max_retry = int(self._get("OpenAI", "MAX_RETRY", "3", ["MAX_RETRY", "max_retry"]) or 3)
        self.openaiapi_url = self._get("OpenAI", "OPENAIAPI_URL", "https://api.openai.com/v1/chat/completions", ["OPENAIAPI_URL", "openaiapi_url"]) or "https://api.openai.com/v1/chat/completions"
        # OpenRouter 需使用 openai/gpt-3.5-turbo 格式
        if "openrouter" in self.openaiapi_url.lower() and "/" not in self.llm_model:
            self.llm_model = f"openai/{self.llm_model}"
        self.top_p = float(self._get("OpenAI", "TOP_P", "1", ["TOP_P", "top_p"]) or 1)
        self.temperature = float(self._get("OpenAI", "TEMPERATURE", "0.5", ["TEMPERATURE", "temperature"]) or 0.5)
        self.max_tokens = int(self._get("OpenAI", "MAX_TOKENS", "2048", ["MAX_TOKENS", "max_tokens"]) or 2048)
        _sv = self._get("OpenAI", "SSL_VERIFY", "true", ["SSL_VERIFY", "ssl_verify"]) or "true"
        self.ssl_verify = str(_sv).lower() not in ("false", "0", "no")

        self.session = requests.Session()
        self.headers = {"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"}
    
    def run(self):
        while True:
            prompt, context, sys_prompt, tools = self.prompt_queue.get()  # 从队列中获取 prompt 和 context    
            self.get_response_from_gpt(inputs=prompt, history=context,sys_prompt=sys_prompt ,tools=tools)
            # time.sleep(0.1)

    def get_full_error(self, chunk, stream_response):
        """
            获取完整的从Openai返回的报错
        """
        while True:
            try:
                chunk += next(stream_response)
            except:
                break
        return chunk

    #获取gpt回复
    def get_response_from_gpt(self, inputs, history, sys_prompt='',
                              handle_token_exceed=True,retry_times_at_unknown_error=2,tools=False):
        # 多线程的时候，需要一个mutable结构在不同线程之间传递信息
        # list就是最简单的mutable结构，我们第一个位置放gpt输出，第二个位置传递报错信息

        # executor = ThreadPoolExecutor(max_workers=16)
        mutable = ["", time.time()]

        def _req_gpt(inputs, history, sys_prompt):
            retry_op = retry_times_at_unknown_error
            exceeded_cnt = 0
            while True:
                # watchdog error
                # if len(mutable) >= 2 and (time.time()-mutable[1]) > 5:
                #     raise RuntimeError("检测到程序终止。")
                try:
                    # 【第一种情况】：顺利完成
                    result = self.gpt_stream_connection(
                        inputs=inputs, history=history, sys_prompt=sys_prompt)
                    return result
                except ConnectionAbortedError as token_exceeded_error:
                    # 【第二种情况】：Token溢出
                    if handle_token_exceed:
                        exceeded_cnt += 1
                        # 【选择处理】 尝试计算比例，尽可能多地保留文本
                        from toolbox import get_reduce_token_percent
                        p_ratio, n_exceed = get_reduce_token_percent(
                            str(token_exceeded_error))
                        MAX_TOKEN = 4096
                        EXCEED_ALLO = 512 + 512 * exceeded_cnt
                        inputs, history = self.input_clipping(
                            inputs, history, max_token_limit=MAX_TOKEN-EXCEED_ALLO)
                        mutable[0] += f'[Local Message] 警告，文本过长将进行截断，Token溢出数：{n_exceed}。\n\n'
                        continue  # 返回重试
                    else:
                        # 【选择放弃】
                        tb_str = '```\n' + traceback.format_exc() + '```'
                        mutable[0] += f"[Local Message] 警告，在执行过程中遭遇问题, Traceback：\n\n{tb_str}\n\n"
                        return mutable[0]  # 放弃
                except Exception as e:
                    # 【第三种情况】：其他错误：重试几次
                    tb_str = '```\n' + traceback.format_exc() + '```'
                    print(tb_str)
                    mutable[0] += f"[Local Message] 警告，在执行过程中遭遇问题, Traceback：\n\n{tb_str}\n\n"
                    if retry_op > 0:
                        retry_op -= 1
                        mutable[0] += f"[Local Message] 重试中，请稍等 {retry_times_at_unknown_error-retry_op}/{retry_times_at_unknown_error}：\n\n"
                        if "Rate limit reached" in tb_str:
                            time.sleep(30)
                        time.sleep(5)
                        continue  # 返回重试
                    else:
                        time.sleep(5)
                        return mutable[0]  # 放弃

        # 提交任务
        # future = executor.submit(_req_gpt, inputs, history, sys_prompt)

        # while True:
        #     if future.done():
        #         break
        # final_result = future.result()
        final_result = _req_gpt(inputs, history, sys_prompt)
        if tools:
            self.tools_received.emit(final_result)
        else:
            self.response_received.emit(final_result)
    
    def gpt_stream_connection(self, inputs, history, sys_prompt):
        headers, payload = self.generate_payload(inputs=inputs, system_prompt=sys_prompt, stream=True,history=history)
        retry = 0
        last_err = None
        while True:
            try:
                response = requests.post(self.openaiapi_url, headers=headers, proxies=self.proxies,
                                        json=payload, stream=True, timeout=self.timeout_seconds, verify=self.ssl_verify)
                break
            except requests.exceptions.InvalidSchema as e:
                if "SOCKS" in str(e):
                    raise RuntimeError(
                        "当前使用 SOCKS 代理(socks5/socks5h)，需要安装 PySocks： pip install PySocks\n"
                        "若代理实为 HTTP，请将 config 中 proxy 改为 http://127.0.0.1:7890"
                    ) from e
                raise
            except (requests.exceptions.ConnectionError, requests.exceptions.ProxyError, OSError) as e:
                last_err = e
                retry += 1
                if retry > self.max_retry:
                    raise RuntimeError(
                        "连接被代理或网络重置（Connection reset by peer）。\n"
                        "请尝试：1）确认代理已开启（如 Clash 等）；2）在 pet_config_private.ini 的 [OpenAI] 下设置 ssl_verify = false；3）稍后重试。"
                    ) from e
                time.sleep(2)
                print(f'连接中断，正在重试 ({retry}/{self.max_retry}) ……')
            except requests.exceptions.ReadTimeout as e:
                last_err = e
                retry += 1
                traceback.print_exc()
                if retry > self.max_retry:
                    raise TimeoutError from e
                if self.max_retry != 0:
                    print(f'请求超时，正在重试 ({retry}/{self.max_retry}) ……')
                time.sleep(2)

        stream_response = response.iter_lines()
        result = ''
        json_data = None
        while True:
            try:
                chunk = next(stream_response).decode()
            except StopIteration:
                break
            except requests.exceptions.ConnectionError:
                try:
                    chunk = next(stream_response).decode()
                except StopIteration:
                    break
            if len(chunk) == 0:
                continue
            # 跳过 SSE 注释行（如 OpenRouter 的 ": OPENROUTER PROCESSING"）
            if chunk.startswith(':'):
                continue
            if not chunk.startswith('data:'):
                error_msg = self.get_full_error(chunk.encode('utf8'), stream_response).decode()
                if "reduce the length" in error_msg:
                    raise ConnectionAbortedError("OpenAI拒绝了请求:" + error_msg)
                raise RuntimeError("OpenAI拒绝了请求：" + error_msg)
            raw = chunk.lstrip('data:').strip()
            if raw == '[DONE]':
                break
            if not raw:
                continue
            try:
                json_data = json.loads(raw)['choices'][0]
            except json.JSONDecodeError:
                continue
            delta = json_data.get("delta", {})
            if "content" in delta:
                result += delta["content"]
        if json_data and json_data.get('finish_reason') == 'length':
            raise ConnectionAbortedError("正常结束，但显示Token不足，导致输出不完整，请削减单次输入的文本量。")
        return result 

    def generate_payload(self, inputs, system_prompt, stream, history):
        """
            整合所有信息，选择LLM模型，生成http请求，为发送请求做准备
        """
        timeout_bot_msg = '[Local Message] Request timeout. Network error. Please check proxy settings in config.py.' + \
                  '网络错误，检查代理服务器是否可用，以及代理设置的格式是否正确，格式须是[协议]://[地址]:[端口]，缺一不可。'
        
        # 支持 OpenAI (51位) 及 OpenRouter 等更长的 key
        if len(self.api_key) < 20 or not self.api_key.startswith("sk-"):
            raise AssertionError("你提供了错误的API_KEY。\n\n1. 临时解决方案：直接在输入区键入api_key，然后回车提交。\n\n2. 长效解决方案：在 config 中配置。")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        if not(
            self.api_key.startswith("sk-")
            or self.api_key.startswith("sk-or-")
        ):
            raise AssertionError("API KEY格式不正确。 ")
        headers = {
            "Content-Type":"application/json",
            "Authorization":f"Bearer {self.api_key}"
        }


        messages = [{"role": "system", "content": system_prompt}]
        user_history = history[0]
        pet_history = history[1]
        if user_history:
            for index in range(0, len(user_history)):
                what_i_have_asked = {}
                what_i_have_asked["role"] = "user"
                what_i_have_asked["content"] = user_history[index]
                
                what_gpt_answer = {}
                what_gpt_answer["role"] = "assistant"

                try:
                    what_gpt_answer["content"] = pet_history[index]
                except:
                    what_gpt_answer["content"] = ""
                if what_i_have_asked["content"] != "":
                    if what_gpt_answer["content"] == "": continue
                    if what_gpt_answer["content"] == timeout_bot_msg: continue
                    messages.append(what_i_have_asked)
                    messages.append(what_gpt_answer)
                else:
                    messages[-1]['content'] = what_gpt_answer['content']

        what_i_ask_now = {}
        what_i_ask_now["role"] = "user"
        what_i_ask_now["content"] = inputs
        messages.append(what_i_ask_now)

        payload = {
            "model": self.llm_model,
            "messages": messages,
            "temperature": self.temperature,
            "top_p": self.top_p,
            "max_tokens": self.max_tokens,
            "n": 1,
            "stream": stream,
            "presence_penalty": 0,
            "frequency_penalty": 0,
        }
        try:
            print(f" {self.llm_model} : {len(history[0])} : {inputs[:100]} ..........")
        except:
            print('输入中可能存在乱码。')
        return headers,payload


