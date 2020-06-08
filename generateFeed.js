const fs = require('fs')
const path = require('path')

const got = require('got')
const cheerio = require('cheerio')

const feedFilePath = path.join(__dirname, 'feed.xml')

got('https://ramdajs.com/docs/')
  .then(parseHTML)
  .then(getRandomRamdaMethodFromPage)
  .then(setLinksInHtmlToFullAddress)
  .then(removeOldItemsInFeed)
  .catch(err => console.error(err))

function parseHTML({body}){
  return cheerio.load(body)
}

function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomRamdaMethodFromPage($ramdapage){
  const cards = $ramdapage('main .card')
  const randomNumberInRange = getRandomInt(1, cards.length)
  const card = $ramdapage('main .card').get(randomNumberInRange)
  return [$ramdapage, card]
}

function setLinksInHtmlToFullAddress([$ramdapage, card]){
  const cardWithFullLinks = $ramdapage(card).find('a[href^="#"]').each(function() {
    $ramdapage(this).attr('href', 'https://ramdajs.com/docs/' + $ramdapage(this).attr('href'))
  })
  return [$ramdapage, cardWithFullLinks]
}

function removeOldItemsInFeed([$ramdapage, card]){
  return fs.promises.readFile(feedFilePath)
    .then(fileData => {
      const $feedxml = cheerio.load(fileData)
      const feedItems = $feedxml('item')
      if(feedItems.length > 6){
        $feedxml('item').get(6).remove()
      }
      return [$ramdapage, card, $feedxml]
    })
}

function createNewFeedItem([$ramdapage, card]){
  return `
    <item>
      <title>
          <![CDATA[Ramda: ${$ramdapage(card).find('h2').text()}]]>
      </title>
      <description>
          <![CDATA[use this for the content. It can include html.]]>
      </description>
      <link>${$ramdapage(card).attr('href')}</link>
      <guid isPermaLink="true">${$ramdapage(card).attr('href')}</guid>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
    `
}

function addNewItemToFeed([card, $feedxml]){
  const newFeedItem = createNewFeedItem(card)
  $feedxml('channel').append(newFeedItem)
  return fs.promises.writeFile($feedxml, $feedxml)
}

