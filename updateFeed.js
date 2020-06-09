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
  console.log(`Running updateFeed at ${new Date().toUTCString()}`)
  getRamdaPage()
    .then(parseHTML)
    .then(getRandomRamdaMethod)
    .then(setLinksInHtmlToFullAddress)
    .then(removeReplLinksInHtml)
    .then(convertHtmlExpandLinkToDetailsElement)
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

function convertHtmlExpandLinkToDetailsElement(card){
  const $ = cheerio.load(card)
  const expandLink = $('a[href$="#expand"]')
  if(!expandLink.get(0)) return card
  const expandLinkText = `Expand ${$.text(expandLink)}`
  const expandDetails = $.html(expandLink.siblings())
  expandLink.parent().replaceWith(`<details><summary>${expandLinkText}</summary>${expandDetails}</details>`)
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
      "content": escape($.html($(card))),
      "link": $('h2 a').attr('href'),
      "guid": $('h2 a').attr('href'),
      "pubDate": ((new Date()).toISOString())
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
<?xml-stylesheet type="text/css" href="https://ramda-feeder.openode.io/feed-stylesheet.css" ?>
<feed xmlns="http://www.w3.org/2005/Atom">
    <updated>${(new Date()).toISOString()}</updated>
    <icon>https://ramda-feeder.openode.io/favicon.ico</icon>
    <id>https://ramdajs.com/docs/</id>
    <link rel="self" href="https://ramda-feeder.openode.io/feed" type="application/atom+xml" />
    <subtitle>Get a new Ramda api method in your RSS feed each day.</subtitle>
    <title>Ramda Daily Feed</title>
    ${
      feedItems.reduce((acc, feedItem) => `${acc}
        <entry>
            <author>
                <name>${feedItem.link}</name>
                <uri>${feedItem.link}</uri>
            </author>
            <content type="html">${feedItem.content}</content>
            <id>${feedItem.guid}</id>
            <link href="${feedItem.link}" />
            <updated>${feedItem.pubDate}</updated>
            <title>Ramda: ${feedItem.title}</title>
        </entry>
        `
      , '')
    }
</feed>
`

function updateFeedXMLFile([,feedItems]){
  return fs.promises.writeFile(feedXMLFilePath, generateFeedXML(feedItems))
}

module.exports = {
  updateFeed
}