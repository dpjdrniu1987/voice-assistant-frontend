import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import test from '@/components/test'
import voiceassistant from '@/components/voiceassistant'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/hello',
      name: 'HelloWorld',
      component: HelloWorld
    },
    {
      path: '/assistant',
      name: 'assistant',
      component: test
    },
    {
      path: '/',
      name: 'voiceassistant',
      component: voiceassistant
    }
  ]
})

