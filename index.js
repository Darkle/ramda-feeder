const path = require('path')

const express = require('express')
const { CronJob } = require('cron')

const { updateFeed } = require('./updateFeed.js')

const app = express()
const port = 80
const feedXMLFilePath = path.join(__dirname, 'feed.xml')
const indexHTMLFilePath = path.join(__dirname, 'index.html')
const cronJob = new CronJob('0 0 13 * * *', updateFeed)

app.use(express.static('assets'))

app.get('/', (_, res) => res.sendFile(indexHTMLFilePath))

app.get('/feed', (_, res) => {
  res.set('Content-Type', 'application/rss+xml')
  res.sendFile(feedXMLFilePath)
})

app.listen(port, () => console.log(`Server has started`))

cronJob.start()

updateFeed()

process.on('unhandledRejection', err => console.error(err))
process.on('uncaughtException', err => console.error(err))
