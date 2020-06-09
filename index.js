const path = require('path')

const express = require('express')
const {CronJob} = require('cron')

const {updateFeed} = require('./updateFeed.js')

const app = express()
const port = 80
const feedXMLFilePath = path.join(__dirname, 'feed.xml')
const indexHTMLFilePath = path.join(__dirname, 'index.html')
const cronJob = new CronJob('0 0 5 * * *', updateFeed)

app.use(express.static('assets'))

app.get('/', (req, res) => res.sendFile(indexHTMLFilePath))

app.get('/feed', (req, res) => {
  res.set('Content-Type', 'application/rss+xml')
  res.sendFile(feedXMLFilePath)
})

app.listen(port, () => console.log(`Server has started`))

cronJob.start()

process.on('unhandledRejection', err => console.error(err))
process.on('uncaughtException', err => console.error(err))