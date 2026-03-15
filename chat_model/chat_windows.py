from PyQt5.QtWidgets import QDialog, QVBoxLayout, QSizePolicy,\
    QHBoxLayout, QLabel,QWidget, QScrollArea, QGridLayout, QSpacerItem
from PyQt5.QtCore import Qt, QSize
from PyQt5.QtGui import QPixmap, QFontMetrics

#聊天框的主体部分，展示相关
class ChatWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.scroll_area = QScrollArea(self)
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setFocusPolicy(Qt.NoFocus)
        self.scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)  # 只显示垂直滚动条
        
        # 美化滚动条
        self.scroll_area.setStyleSheet("""
            QScrollArea {
                border: none;
            }
            QScrollBar:vertical {
                width: 8px;
                background: #f1f1f1;
                border-radius: 4px;
            }
            QScrollBar::handle:vertical {
                background: #c1c1c1;
                border-radius: 4px;
            }
            QScrollBar::handle:vertical:hover {
                background: #a8a8a8;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0;
            }
        """)
        
        self.container = QWidget(self.scroll_area)
        self.container.setStyleSheet("background-color: #f0f2f5;")
        self.container_layout = QVBoxLayout(self.container)
        self.container_layout.setContentsMargins(5, 5, 5, 5)
        self.container_layout.setSpacing(10)  # 设置消息之间的间距
        
        self.scroll_area.setWidget(self.container)

        layout = QHBoxLayout(self)
        layout.addWidget(self.scroll_area)
        layout.setContentsMargins(0, 0, 0, 0)

    def clear_chat_history(self):
    # 清空布局中的所有组件
        while self.container_layout.count():
            item = self.container_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

#每条消息的符复合组件
class MessageWidget(QWidget):
    def __init__(self, role, text, parent=None):
        super().__init__(parent)
        self.role = role
        self.text = text
        
        # 布局
        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 5, 10, 5)
        layout.setSpacing(10)
        
        # 头像
        self.avatar_label = QLabel(self)
        self.avatar_label.setFixedSize(40, 40)
        try:
            avatar = QPixmap(f"pet_image\\avatar_{role}.png").scaled(40, 40, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self.avatar_label.setPixmap(avatar)
        except:
            # 如果头像文件不存在，使用默认头像
            self.avatar_label.setText(role[0].upper())
            self.avatar_label.setStyleSheet("QLabel { background-color: #e0e0e0; border-radius: 20px; text-align: center; font-weight: bold; }")
        self.avatar_label.setAlignment(Qt.AlignCenter)
        
        # 消息气泡
        self.text_label = QLabel(self)
        self.text_label.setWordWrap(True)
        self.text_label.setText(text)
        self.text_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        self.text_label.setMinimumWidth(100)
        self.text_label.setMaximumWidth(400)
        
        # 根据角色设置不同的样式
        if role == "user":
            # 用户消息：右对齐，蓝色气泡
            layout.addSpacerItem(QSpacerItem(40, 20, QSizePolicy.Expanding, QSizePolicy.Minimum))
            self.text_label.setStyleSheet("""
                QLabel {
                    background-color: #e3f2fd;
                    color: #1976d2;
                    border-radius: 18px;
                    border-bottom-right-radius: 4px;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-family: 'Microsoft YaHei', sans-serif;
                }
            """)
            layout.addWidget(self.text_label, 0, Qt.AlignRight)
            layout.addWidget(self.avatar_label)
        else:
            # 宠物消息：左对齐，绿色气泡
            layout.addWidget(self.avatar_label)
            self.text_label.setStyleSheet("""
                QLabel {
                    background-color: #e8f5e8;
                    color: #2e7d32;
                    border-radius: 18px;
                    border-bottom-left-radius: 4px;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-family: 'Microsoft YaHei', sans-serif;
                }
            """)
            layout.addWidget(self.text_label, 0, Qt.AlignLeft)
            layout.addSpacerItem(QSpacerItem(40, 20, QSizePolicy.Expanding, QSizePolicy.Minimum))

    def sizeHint(self):
        fm = QFontMetrics(self.text_label.font())
        # 计算文本高度
        text_rect = fm.boundingRect(0, 0, 380, 1000, Qt.TextWordWrap, self.text_label.text())
        text_height = text_rect.height() + 24  # 加上padding
        return QSize(self.parent().width() - 40, max(text_height, 50))