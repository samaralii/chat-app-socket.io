const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom, printAllUsers } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const PORT = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

let count = 0

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Welcome!', 'Admin'))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`, 'Admin'))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

    })

    socket.on('sendMessage', (data, callback) => {

        const user = getUser(socket.id)

        const filter = new Filter()

        if (filter.isProfane(data)) {
            return callback('Profanity is not allowed')
        }

        io.to(user.room).emit('message', generateMessage(data, user.username))
        callback()
    })

    socket.on('sendLocation', (data, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(`https://google.com/maps?q=${data.latitude},${data.longitude}`, user.username))
        callback('Location Shared')
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`, 'Admin'))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })


    //send event to specific connection
    //socket.emit('countUpdated', count)

    //send event to every single connection
    // io.emit('countUpdated', count)
})

server.listen(PORT, () => {
    console.log(`Listening to port ${PORT}`)
})