"""连接测试 — 验证 minium 与小程序的基本通信"""

import minium
import time


class ConnectionTest(minium.MiniTest):

    def test_01_check_page_api(self):
        """检查 Page 对象可用 API"""
        page = self.mini.page
        attrs = [a for a in dir(page) if not a.startswith('_')]
        print(f'  Page 属性: {attrs}')

        # 尝试获取 data
        try:
            d = page.data
            print(f'  page.data = {type(d).__name__}: {list(d.keys())[:10] if isinstance(d, dict) else d}')
        except Exception as e:
            print(f'  page.data 错误: {e}')

    def test_02_get_elements(self):
        """获取页面元素"""
        page = self.mini.page
        views = page.get_elements('view')
        print(f'  view 元素: {len(views)}')
        self.assertGreater(len(views), 0)

    def test_03_navigate_to_category(self):
        """测试 navigate_to"""
        try:
            page = self.mini.app.navigate_to('/pages/category/category')
            time.sleep(3)
            views = self.mini.page.get_elements('view')
            print(f'  分类页 view 元素: {len(views)}')
            self.assertGreater(len(views), 0)
        except Exception as e:
            print(f'  navigate_to 错误: {e}')
            raise

    def test_04_go_back(self):
        """返回"""
        self.mini.app.navigate_back()
        time.sleep(2)
        views = self.mini.page.get_elements('view')
        print(f'  返回后 view 元素: {len(views)}')
        self.assertGreater(len(views), 0)
