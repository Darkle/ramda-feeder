const fs = require('fs')
const path = require('path')

const got = require('got')
const cheerio = require('cheerio')
const {escape} = require('html-escaper')
const { Notifier } = require('@airbrake/node')

const feedXMLFilePath = path.join(__dirname, 'feed.xml')
const feedJSONFilePath = path.join(__dirname, 'feed-items.json')
const airbrake = new Notifier({
  projectId: 276409,
  projectKey: 'a37b857c1f537e53a76666654aecb721',
  environment: 'production',
})

function updateFeed(){
  getRamdaPage()
    .then(parseHTML)
    .then(getRandomRamdaMethod)
    .then(setLinksInHtmlToFullAddress)
    .then(removeReplLinksInHtml)
    .then(removeOldItemsInFeed)
    .then(createNewFeedItem)
    .then(updateJSONFeedItems)
    .then(updateFeedXMLFile)
    .catch(err => {
      console.error(err)
      airbrake.notify(err)
    })
}

function getRamdaPage(){
  return got('https://ramdajs.com/docs/')
}

function parseHTML({body}){
  return cheerio.load(body)
}

function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomRamdaMethod($){
  const cards = $('main .card')
  const randomNumberInRange = getRandomInt(1, cards.length)
  const card = $.html($('main .card').get(randomNumberInRange))
  return card
}

function setLinksInHtmlToFullAddress(card){
  const $ = cheerio.load(card)
  $('a[href^="#"]').each(function() {
    $(this).attr('href', 'https://ramdajs.com/docs/' + $(this).attr('href'))
  })
  const modifiedCard = $.html()
  return modifiedCard
}

function removeReplLinksInHtml(card){
  const $ = cheerio.load(card)
  $('.try-repl').remove()
  const modifiedCard = $.html()
  return modifiedCard
}

function removeOldItemsInFeed(card){
  return fs.promises.readFile(feedJSONFilePath)
    .then(JSON.parse)
    .then(({feedItems}) => {
      if(feedItems.length > 6){
        feedItems.pop()
      }
      return [card, feedItems]
    })
}

function createNewFeedItem([card, feedItems]){
  const $ = cheerio.load(card)
  return [
    {
      "title": `Ramda: ${$.text($('h2 a')).trim()}`,
      "description": escape($.html($(card))),
      "link": $('h2 a').attr('href'),
      "guid": $('h2 a').attr('href'),
      "pubDate": (new Date().toUTCString())
    },
    feedItems
  ]
}

function updateJSONFeedItems([newFeedItem, feedItems]){
  feedItems.unshift(newFeedItem)
  return Promise.all([
    fs.promises.writeFile(feedJSONFilePath, JSON.stringify({feedItems})),
    Promise.resolve(feedItems)
  ])
}

const generateFeedXML = (feedItems) => `<?xml version="1.0" encoding="UTF-8"?>
  <rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
    <channel>
      <title>Ramda Feed</title>
      <description>Get a new Ramda api method in your RSS feed each day.</description>
      <link>https://ramda-feed.openode.io/</link>
      <lastBuildDate>Mon, 08 Jun 2020 03:23:41 GMT</lastBuildDate>
      <atom:link href="https://ramda-feed.openode.io/feed" rel="self" type="application/rss+xml" />
      ${
        feedItems.reduce((acc, feedItem) => `${acc}
          <item>
            <title>
                <![CDATA[Ramda: ${feedItem.title}]]>
            </title>
            <description>
                <![CDATA[${feedItem.description}]]>
            </description>
            <link>${feedItem.link}</link>
            <guid isPermaLink="true">${feedItem.guid}</guid>
            <pubDate>${feedItem.pubDate}</pubDate>
          </item>
          `
        , '')
      }
    </channel>
  </rss>
`

function updateFeedXMLFile([,feedItems]){
  return fs.promises.writeFile(feedXMLFilePath, generateFeedXML(feedItems))
}

module.exports = {
  updateFeed
}