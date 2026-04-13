"""pytest 配置：测试前临时禁用自定义 TabBar，测试后恢复"""

import json
import os

APP_JSON_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'app.json'
)


def pytest_configure(config):
    """测试开始前：禁用自定义 TabBar，让 minium 的 switch_tab 正常工作"""
    path = os.path.abspath(APP_JSON_PATH)
    with open(path, 'r', encoding='utf-8') as f:
        app_config = json.load(f)
    if app_config.get('tabBar', {}).get('custom', False):
        app_config['tabBar']['custom'] = False
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(app_config, f, indent=2, ensure_ascii=False)
        print('\n[conftest] 已临时禁用自定义 TabBar')


def pytest_unconfigure(config):
    """测试结束后：恢复自定义 TabBar"""
    path = os.path.abspath(APP_JSON_PATH)
    with open(path, 'r', encoding='utf-8') as f:
        app_config = json.load(f)
    if not app_config.get('tabBar', {}).get('custom', True):
        app_config['tabBar']['custom'] = True
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(app_config, f, indent=2, ensure_ascii=False)
        print('\n[conftest] 已恢复自定义 TabBar')
