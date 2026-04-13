"""BasePage - 所有页面的基类，封装公共操作"""

import time
import os


SCREENSHOTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'screenshots')


class BasePage:
    """页面基类"""

    def __init__(self, mini):
        self.mini = mini
        self.app = mini.app
        self.page = mini.page

    def _screenshot(self, name: str):
        """截图并保存"""
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        path = os.path.join(SCREENSHOTS_DIR, f'{name}_{int(time.time())}.png')
        self.mini.page.screenshot(path)
        return path

    def refresh_page(self):
        """重新获取当前 page 引用"""
        self.page = self.mini.page

    def wait_for_element(self, selector: str, timeout: int = 5) -> bool:
        """等待元素出现"""
        start = time.time()
        while time.time() - start < timeout:
            elements = self.page.get_elements(selector)
            if elements:
                return True
            time.sleep(0.5)
        return False

    def wait_for_data_loaded(self, timeout: int = 8) -> bool:
        """等待页面 loading 状态结束（data.loading = false）"""
        start = time.time()
        while time.time() - start < timeout:
            try:
                data = self.page.data
                if isinstance(data, dict) and data.get('loading') is False:
                    return True
            except Exception:
                pass
            time.sleep(0.3)
        return True

    def get_text(self, selector: str) -> str:
        """获取元素文本"""
        el = self.page.get_element(selector)
        return el.text if el else ''

    def get_elements_count(self, selector: str) -> int:
        """获取元素数量"""
        return len(self.page.get_elements(selector))

    def click(self, selector: str):
        """点击元素"""
        el = self.page.get_element(selector)
        if el:
            el.click()
            time.sleep(0.5)
        else:
            raise Exception(f'元素不存在: {selector}')

    def scroll_to_bottom(self):
        """滚动到页面底部"""
        self.page.scroll_to_bottom()

    def navigate_to(self, path: str):
        """通过小程序路由跳转"""
        self.app.navigate_to(path)
        time.sleep(1)
        self.refresh_page()

    def switch_tab(self, path: str):
        """切换 TabBar"""
        self.app.switch_tab(path)
        time.sleep(1.5)
        self.refresh_page()

    def go_back(self):
        """返回上一页"""
        self.app.navigate_back()
        time.sleep(0.5)
        self.refresh_page()
