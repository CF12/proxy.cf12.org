const express = require('express')
const request = require('request-promise-native')
const cheerio = require('cheerio')
const cors = require('cors')
const { URL } = require('url')

const app = express()
const port = process.env.PORT || 3000
const proxyURL = 'http://localhost:3000/proxy?u='
const urlRegex = /(https|https)?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
// const urlRegex = /^((http|https):\/\/)?([a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+.*)$/gm

const fromBase64 = (data) => {
  return (new Buffer.from(data, 'base64')).toString('ascii')
}

const toBase64 = (data) => {
  return (new Buffer.from(data)).toString('base64')
}

app.use(cors())
app.use('/', express.static('public'))

app.use('/proxy', (req, res) => {
  const url = fromBase64(req.query.u)
  const rootUrl = (new URL(url)).origin
  console.log(url)

  if (!url) {
    res.setHeader(404)
    res.end('404 - Not Found')
  } else {
    request(url, {
      method: req.method,
      resolveWithFullResponse: true,
      encoding: null,
      headers: {
        'user-agent': req.headers['user-agent']
      },
      transform: (body, res) => {
        if (!('content-type' in res.headers))
          return res

        if (res.headers['content-type'].includes('text/html')) {
          const serialize = ($, attr) => {
            $(`[${attr}]`).each((_, el) => {
              el = $(el)

              el.attr(attr, (_, link) => {
                if (link.includes('data:'))
                  return link

                return proxyURL + toBase64(urlRegex.test(link)
                  ? link
                  : rootUrl + link
                )
              })
            })
          }

          const $ = cheerio.load(body)
          serialize($, 'href')
          serialize($, 'link')
          serialize($, 'src')

          $('[integrity]').each((_, el) => {
            $(el).removeAttr('integrity')
          })

          res.body = $.html()
        } else if (res.headers['content-type'].includes('css')) {
          res.body = body.toString().replace(/url\(.+?\)/g, (link) => {
            link = link.match(/\(([^)]+)\)/)[1]

            if (link.includes('data:'))
              return `url(${link})`

            return "url(" + proxyURL + toBase64(urlRegex.test(link)
              ? link
              : rootUrl + link
            ) + ")"
          })
        }

        return res
      }
    })
      .then(dataRes => {
        res.type(dataRes.headers['content-type'])
        res.header(dataRes.statusCode)
        res.end(dataRes.body)
      })
      .catch(err => {
        const dataRes = err.response

        res.type(dataRes.headers['content-type'])
        res.header(dataRes.statusCode)
        res.end(dataRes.body)
      })
    }
})

app.listen(port, () => {
  console.log(`[i] Server listening on port: ${port}`)
})