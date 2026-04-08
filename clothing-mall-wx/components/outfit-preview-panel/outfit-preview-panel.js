Component({
  properties: {
    goods: {
      type: Array,
      value: []
    },
    max: {
      type: Number,
      value: 4
    }
  },

  methods: {
    onRemove: function(e) {
      var id = e.currentTarget.dataset.id;
      this.triggerEvent('remove', { id: id });
    },

    preventTap: function() {}
  }
});
