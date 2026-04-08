import { mount } from '@vue/test-utils'
import Breadcrumb from '@/components/Breadcrumb'
import ElementUI from 'element-ui'
import Vue from 'vue'

Vue.use(ElementUI)

describe('Breadcrumb.vue', () => {
  const mountBreadcrumb = (propsData = {}) => {
    return mount(Breadcrumb, {
      propsData: {
        ...propsData
      },
      mocks: {
        $route: {
          matched: []
        },
        $t: (key) => key // mock vue-i18n
      }
    })
  }

  describe('rendering', () => {
    it('should render correctly', () => {
      const wrapper = mount(Breadcrumb, {
        mocks: {
          $route: {
            matched: [
              { path: '/dashboard', meta: { title: 'Dashboard' } }
            ]
          },
          $t: (key) => key // mock vue-i18n
        }
      })
      expect(wrapper.find('.app-breadcrumb').exists() || wrapper.find('.el-breadcrumb').exists()).toBe(true)
    })
  })
})
