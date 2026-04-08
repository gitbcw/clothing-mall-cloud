import { mount } from '@vue/test-utils'
import Pagination from '@/components/Pagination'
import ElementUI from 'element-ui'
import Vue from 'vue'

Vue.use(ElementUI)

describe('Pagination.vue', () => {
  const mountPagination = (propsData = {}) => {
    return mount(Pagination, {
      propsData: {
        total: 100,
        ...propsData
      }
    })
  }

  describe('rendering', () => {
    it('should render correctly', () => {
      const wrapper = mountPagination({ total: 100 })
      expect(wrapper.find('.pagination-container').exists()).toBe(true)
    })

    it('should be hidden when hidden prop is true', () => {
      const wrapper = mountPagination({ total: 100, hidden: true })
      expect(wrapper.find('.pagination-container.hidden').exists()).toBe(true)
    })

    it('should display el-pagination component', () => {
      const wrapper = mountPagination({ total: 100 })
      expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(true)
    })
  })

  describe('props', () => {
    it('should accept total prop', () => {
      const wrapper = mountPagination({ total: 200 })
      expect(wrapper.props().total).toBe(200)
    })

    it('should have default page as 1', () => {
      const wrapper = mountPagination()
      expect(wrapper.props().page).toBe(1)
    })

    it('should have default limit as 20', () => {
      const wrapper = mountPagination()
      expect(wrapper.props().limit).toBe(20)
    })

    it('should accept custom pageSizes', () => {
      const customPageSizes = [5, 10, 25, 50]
      const wrapper = mountPagination({ pageSizes: customPageSizes })
      expect(wrapper.props().pageSizes).toEqual(customPageSizes)
    })

    it('should have background enabled by default', () => {
      const wrapper = mountPagination()
      expect(wrapper.props().background).toBe(true)
    })
  })

  describe('computed properties', () => {
    it('currentPage should return page prop', () => {
      const wrapper = mountPagination({ page: 3 })
      expect(wrapper.vm.currentPage).toBe(3)
    })

    it('pageSize should return limit prop', () => {
      const wrapper = mountPagination({ limit: 30 })
      expect(wrapper.vm.pageSize).toBe(30)
    })
  })

  describe('events', () => {
    it('should emit update:page when currentPage is set', () => {
      const wrapper = mountPagination()
      wrapper.vm.currentPage = 2
      expect(wrapper.emitted('update:page')).toBeTruthy()
      // el-pagination emits current-change event, which triggers the watcher
      expect(wrapper.emitted('update:page').length).toBeGreaterThan(0)
    })

    it('should emit update:limit when pageSize is set', () => {
      const wrapper = mountPagination()
      wrapper.vm.pageSize = 50
      expect(wrapper.emitted('update:limit')).toBeTruthy()
      expect(wrapper.emitted('update:limit')[0]).toEqual([50])
    })
  })
})
