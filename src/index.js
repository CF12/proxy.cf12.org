const express = require('express')
const needle = require('needle')
const cheerio = require('cheerio')
const { URL } = require('url')

const app = express()
const port = process.env.PORT || 3000
const proxyURL = '/proxy?u='
const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/

const fromBase64 = (data) => {
  return (new Buffer.from(data, 'base64')).toString('ascii')
}

const toBase64 = (data) => {
  return (new Buffer.from(data)).toString('base64')
}

app.use('/', express.static('public'))

app.use('/proxy', (req, res) => {
  const url = fromBase64(req.query.u)
  const rootUrl = (new URL(url)).origin

  if (!url) {
    res.setHeader(400)
    res.end('404 - Not Found')
  } else {
    // TODO: What if error?
    // TODO: Send CORRECT headers?
    needle(req.method, url)
      .then(dataRes => {
        if (!('content-type' in dataRes.headers) || !dataRes.headers['content-type'].includes('text/html')) {
          res.status(dataRes.statusCode)
          res.end(dataRes.body)
          return
        }

        const serialize = ($, attr) => {
          $(`[${attr}]`).each((_, el) => {
            el = $(el)

            el.attr(attr, (_, link) => {
              console.log(proxyURL + (urlRegex.test(link)
                ? link
                : rootUrl + link
              ))

              return proxyURL + toBase64(urlRegex.test(link)
                ? link
                : rootUrl + link
              )
            })
          })
        }

        const $ = cheerio.load(dataRes.body)
        serialize($, 'href')
        serialize($, 'link')
        serialize($, 'src')

        Object.keys(dataRes.headers).forEach(header => {
          res.header(header, dataRes.headers[header])
        })
        res.status(dataRes.statusCode)
        res.end($.html())
      })
    }
})

app.listen(port, () => {
  console.log(`[i] Server listening on port: ${port}`)
})