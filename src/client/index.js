import 'normalize.css'
import './index.scss'

const urlBar = document.querySelector('___url-bar')
const form = document.querySelector('.___url-bar__form')
const url = document.querySelector('.___url-bar__form__url')
const content = document.querySelector('.___content')

const loadURL = (url) => {
  console.log('Visiting: ' + url)
  fetch(`http://localhost:3000/proxy?u=${btoa(url)}`)
    .then(data => data.text())
    .then(data => {
      content.innerHTML = data
    })
}

if (window.location.hash) {
  loadURL(window.location.hash.substr(1))
}

form.addEventListener('submit', e => {
  e.preventDefault()
  loadURL(url.value)
  window.location.hash = url.value
})