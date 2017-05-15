/**
 * Created by 马燥 on 2017/5/14 0014.
 */
//import 'todomvc-app-css/index.css'

import Vue from 'vue'
// let Vue = require('vue')
import AV from 'leancloud-storage'
let APP_ID = 'DcOc5cGIJ6nL7b2ts8s2Xrbs-gzGzoHsz';
let APP_KEY = 'CHB0asUCF3qYoH5x4naPvrtB';
AV.init({
    appId: APP_ID,
    appKey: APP_KEY
});

var filters = {
    all(todos) {
        return todos
    },

    active(todos) {
        return todos.filter((todo)=>{
            return !todo.completed
        })
    },

    completed(todos) {
        return todos.filter((todo)=>{
            return todo.completed
        })
    },
}

let app = new Vue({
    el: '#app',
    data: {
        msg: 'hello world',
        title: 'todosmvc',
        newTodo: '',
        actionType: 'signUp',
        formData: {
            username: '',
            password: ''
        },
        todos: [{
            content: 'vue',
            completed: false
        },{
            content: 'vuex',
            completed: false
        }],
        editedTodo: null,
        hashName: 'all',
        currentUser: null,
    },
    created: function () {

        this.currentUser = this.getCurrentUser();  //查看是否登录
        this.fetchTodos() // 登录成功后读取 todos
    },
    computed: {
        remain() {
            return filters.active(this.todos).length
        },
        isAll: {
            get() {
                return this.remain === 0
            },
            set(value) {
                this.todos.forEach((todo)=>{
                    todo.completed = value
                })
            }
        },
        filteredTodos(){
            return filters[this.hashName](this.todos)
        }
    },
    methods: {
        updateTodos: function () {
            // 想要知道如何更新对象，先看文档 https://leancloud.cn/docs/leanstorage_guide-js.html#更新对象
            let dataString = JSON.stringify(this.todos) // JSON 在序列化这个有 id 的数组的时候，会得出怎样的结果？
            let avTodos = AV.Object.createWithoutData('AllTodos', this.todos.id)
            avTodos.set('content', dataString)
            avTodos.save().then(()=> {
                console.log('更新成功')
            })
        },
        saveTodos: function () {
            let dataString = JSON.stringify(this.todos)
            var AVTodos = AV.Object.extend('AllTodos');
            var avTodos = new AVTodos();
            var acl = new AV.ACL()
            acl.setReadAccess(AV.User.current(), true) // 只有这个 user 能读
            acl.setWriteAccess(AV.User.current(), true) // 只有这个 user 能写

            avTodos.set('content', dataString);
            avTodos.setACL(acl) // 设置访问控制
            avTodos.save().then((todo) => {
                this.todos.id = todo.id  // 一定要记得把 id 挂到 this.todos 上，否则下次就不会调用 updateTodos 了
                console.log('保存成功');
            }, function (error) {
                alert('保存失败');
            });
        },
        saveOrUpdateTodos: function () {
            if (this.todos.id) {
                this.updateTodos()
            } else {
                this.saveTodos()
            }
        },
        addTodo(e) {
            // console.log(e.target.value)
            if(!this.newTodo){
                return
            }
            this.todos.push({
                content: this.newTodo,
                createdAt: new Date(),
                completed: false
            })
            this.newTodo = ''
            this.saveOrUpdateTodos()
        },
        removeTodo(index) {
            this.todos.splice(index,1)
            this.saveOrUpdateTodos()
        },
        editTodo(todo){
            this.editCache = todo.content
            this.editedTodo = todo
        },
        doneEdit(todo,index){
            this.editedTodo = null
            if(!todo.content){
                this.removeTodo(index)
            }
        },
        cancleEdit(todo) {
            this.editedTodo = null
            todo.content = this.editCache
        },
        clear() {
            this.todos = filters.active(this.todos)
        },
        getCurrentUser: function () {
            let current = AV.User.current()
            if (current) {
                let {id, createdAt, attributes: {username}} = current
                // 上面这句话看不懂就得看 MDN 文档了
                // 我的《ES 6 新特性列表》里面有链接：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
                return {id, username, createdAt} // 看文档：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Object_initializer#ECMAScript_6%E6%96%B0%E6%A0%87%E8%AE%B0
            } else {
                return null
            }
        },
        signUp: function () {
            let user = new AV.User();

            user.setUsername(this.formData.username);
            user.setPassword(this.formData.password);
            user.signUp().then((loginedUser) => {
                this.currentUser = this.getCurrentUser()
            }, (error) => {
                alert('注册失败')
                console.log(error)
            });
        },
        login: function () {
            AV.User.logIn(this.formData.username, this.formData.password).then((loginedUser) => {
                this.currentUser = this.getCurrentUser()
                this.fetchTodos() // 登录成功后读取 todos
            }, function (error) {
                alert('登录失败')
                console.log(error)
            });
        },
        logout: function () {
            AV.User.logOut()
            this.currentUser = null
            window.location.reload()
        },
        fetchTodos: function () {
            if (this.currentUser) {
                var query = new AV.Query('AllTodos');
                query.find()
                    .then((todos) => {

                        let avAllTodos = todos[0] // 因为理论上 AllTodos 只有一个，所以我们取结果的第一项
                        let id = avAllTodos.id
                        this.todos = JSON.parse(avAllTodos.attributes.content) // 为什么有个 attributes？因为我从控制台看到的
                        this.todos.id = id // 为什么给 todos 这个数组设置 id？因为数组也是对象啊
                    }, function (error) {
                        console.error(error)
                    })
            }
        }
    },
    directives: {
        focus(el,value){
            if(value){
                el.focus()
            }
        }
    }
})


function hashChange() {
    let hashName = location.hash.replace(/#\/?/,'')
    if(filters[hashName]){
        app.hashName = hashName
    }else{
        location.hash = ''
        app.hashName = 'all'
    }
}

window.addEventListener('hashchange', hashChange)

// new Vue({
// 	el: '.info'
// })