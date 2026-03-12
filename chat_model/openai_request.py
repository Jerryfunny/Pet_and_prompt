# 借鉴了 https://github.com/binary-husky/chatgpt_academic 项目

import json
import traceback
import requests
from queue import Queue
import time
from PyQt5.QtCore import QThread, pyqtSignal
from concurrent.futures import ThreadPoolExecutor

# private_config.py放自己的秘密如API和代理网址
# 读取时首先看是否存在私密的config_private配置文件（不受git管控），如果有，则覆盖原config文件
class OpenAI_request(QThread):
    response_received = pyqtSignal(str)
    tools_received = pyqtSignal(str)

    def __init__(self, config):
        super().__init__()
        self.config = config
        self.prompt_queue = Queue()

        #基本参数
        self.api_key = self.config["OpenAI"]["openai_api_key"]
        self.llm_model = self.config["OpenAI"]["llm_model"]
        self.proxy = self.config["OpenAI"]["proxy"]
        self.proxies = {
            "http": self.proxy,
            "https": self.proxy,
        }
        self.timeout_seconds = int(self.config["OpenAI"]["timeout_seconds"])
        self.max_retry = int(self.config["OpenAI"]["max_retry"])
        self.openaiapi_url = self.config["OpenAI"]["openaiapi_url"]
        self.top_p = float(self.config["OpenAI"]["top_p"])
        self.temperature = float(self.config["OpenAI"]["temperature"])
        self.max_tokens = int(self.config["OpenAI"]["max_tokens"])

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
        while True:
            try:
                # make a POST request to the API endpoint, stream=False
                response = requests.post(self.openaiapi_url, headers=headers, proxies=self.proxies,
                                        json=payload, stream=True, timeout=self.timeout_seconds); break
            except requests.exceptions.ReadTimeout as e:
                retry += 1
                traceback.print_exc()
                if retry > self.max_retry: raise TimeoutError
                if self.max_retry!=0: print(f'请求超时，正在重试 ({retry}/{self.max_retry}) ……')

        stream_response = response.iter_lines()
        result = ''
        print("开始处理流式响应")
        
        # 处理流式响应
        for chunk in stream_response:
            try:
                # 解码chunk
                chunk_str = chunk.decode('utf-8')
                print(f"接收到chunk: {chunk_str}")
            except UnicodeDecodeError:
                print("Unicode解码错误")
                continue
            
            # 跳过空chunk
            if not chunk_str:
                print("跳过空chunk")
                continue
            
            # 跳过OPENROUTER PROCESSING信息
            if 'OPENROUTER PROCESSING' in chunk_str:
                print("跳过OPENROUTER PROCESSING信息")
                continue
            
            # 只处理以data:开头的chunk
            if not chunk_str.startswith('data:'):
                print("跳过非data:开头的chunk")
                continue
            
            # 提取JSON字符串
            json_str = chunk_str[5:].strip()  # 跳过'data:'前缀
            print(f"提取的JSON字符串: {json_str}")
            
            # 跳过空的JSON字符串
            if not json_str:
                print("跳过空的JSON字符串")
                continue
            
            # 跳过[DONE]标记
            if json_str == '[DONE]':
                print("遇到[DONE]标记，结束处理")
                break
            
            # 尝试解析JSON
            try:
                json_data = json.loads(json_str)
                print(f"解析后的JSON数据: {json_data}")
            except json.JSONDecodeError:
                # 打印错误信息以便调试
                print(f"JSON解码错误: {json_str}")
                continue
            
            # 检查是否包含choices字段
            if not isinstance(json_data, dict) or 'choices' not in json_data:
                print("JSON数据不包含choices字段")
                continue
            
            # 检查choices数组是否为空
            choices = json_data['choices']
            if not isinstance(choices, list) or len(choices) == 0:
                print("choices数组为空")
                continue
            
            # 处理第一个choice
            choice = choices[0]
            if not isinstance(choice, dict):
                print("choice不是字典")
                continue
            
            # 检查是否包含delta字段
            if 'delta' not in choice:
                print("choice不包含delta字段")
                continue
            
            delta = choice['delta']
            if not isinstance(delta, dict):
                print("delta不是字典")
                continue
            
            # 跳过role字段
            if 'role' in delta:
                '''print(f"跳过role字段: {delta['role']}")
                continue'''
                print(f"role字段: {delta['role']}")
            
            # 提取content
            if 'content' in delta:
                content = delta['content']
                result += content
                print(f"提取到content: {content}")
                print(f"当前result: {result}")
            
            # 检查是否结束
            if 'finish_reason' in choice and choice['finish_reason'] == 'length':
                raise ConnectionAbortedError("正常结束，但显示Token不足，导致输出不完整，请削减单次输入的文本量。")
            
            # 如果delta为空，结束处理
            if len(delta) == 0:
                print("delta为空，结束处理")
                break
        
        print(f"最终result: {result}")
        print(f"result长度: {len(result)}")
        return result 

    def generate_payload(self, inputs, system_prompt, stream, history):
        """
            整合所有信息，选择LLM模型，生成http请求，为发送请求做准备
        """
        timeout_bot_msg = '[Local Message] Request timeout. Network error. Please check proxy settings in config.py.' + \
                  '网络错误，检查代理服务器是否可用，以及代理设置的格式是否正确，格式须是[协议]://[地址]:[端口]，缺一不可。'
        
        '''if len(self.api_key) != 51:
            raise AssertionError("你提供了错误的API_KEY。\n\n1. 临时解决方案：直接在输入区键入api_key，然后回车提交。\n\n2. 长效解决方案：在config.py中配置。")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }'''

        if not (
            self.api_key.startswith("sk-") 
            or self.api_key.startswith("sk-or-")
        ):
            raise AssertionError("API_KEY格式不正确。")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
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
            "temperature": self.temperature,  # 1.0,
            "top_p": self.top_p,  # 1.0,
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


