import axios from 'axios'
import express from 'express'
import * as cheerio from 'cheerio'
import * as fs from 'fs'
import { json2xml } from 'xml-js'

const PORT = process.env.PORT || 3000
const app = express()

let n = 0
let jobArr = []

const months = ['month', 'months']
const days = ['day old', 'days old']
const hours = ['hour', 'hours']
const baseURL = 'https://example.com'

const formatXML = (data) => {
  fs.writeFile(
    'xJobs.xml',
    '<? xml version = "1.0" encoding = "utf-8" ?>\n<jobs>\n' +
      json2xml(JSON.stringify(data), {
        compact: true,
        spaces: 4,
        fullTagEmptyElement: true,
        elementNameFn: (val) => {
          return isNaN(val) ? val : 'job'
        }
      }) +
      '\n</jobs>',
    (err) => {
      if (err) {
        console.log('Error Writing File:', err)
      } else {
        console.log('Successfully Wrote to XML')
      }
    }
  )
}

const formatJSON = (data) => {
  fs.writeFile(
    './xJobs.json',
    JSON.stringify(data, null, 4),
    { encoding: 'utf8' },
    (err) => {
      if (err) {
        console.log('Error Writing File:', err)
      } else {
        console.log('Successfully Wrote to JSON')
      }
    }
  )
}

const getDetails = async (url) => {
  const res = await axios.get(url)
  const $ = cheerio.load(res.data)

  let contents = $('[itemprop=description]')
    .text()
    .replace(/\s+/g, ' ')
    .replace(/\t/g, '')
    .trim()

  return contents
}

const getJobs = async () => {
  const xJobs = `https://example.com/jobs/search/results?page=${n}`
  const res = await axios.get(xJobs)
  const $ = cheerio.load(res.data)

  const jobWrap = $('.arResultsList').find('.arJobPodWrap')
  let lastPage = $('.pagination-next').prev().text()
  lastPage = parseInt(lastPage) + 2

  let postDate
  let timeStamp
  let allJobs

  jobWrap.each((idx, elem) => {
    const job = {
      ID: { _cdata: '' },
      postDate: { _cdata: '' },
      title: { _cdata: '' },
      company: { _cdata: '' },
      companyURL: { _cdata: '' },
      location: { _cdata: '' },
      shortDesc: { _cdata: '' },
      summaryURL: { _cdata: '' },
      fullDesc: { _cdata: '' }
    }

    let currDate = $(elem).find('.arJobPostDate span').text()

    const date = new Date()
    const checkMonth = months.some((word) => currDate.includes(word))
    const checkDay = days.some((word) => currDate.includes(word))
    const checkHour = hours.some((word) => currDate.includes(word))

    const formatMonth = () => {
      date.setMonth(date.getMonth() - 1)
      timeStamp = date.toLocaleDateString()
      // return timeStamp
      return date
    }

    const formatDay = () => {
      currDate = parseInt(currDate.replace(/\D/, ''))
      postDate = date.getDate() - currDate
      date.setDate(postDate)
      timeStamp = date.toLocaleDateString()
      // return timeStamp
      return date
    }

    const formatHour = () => {
      timeStamp = date.toLocaleDateString()
      // return timeStamp
      return date
    }

    checkMonth
      ? (job.postDate._cdata = formatMonth())
      : checkDay
      ? (job.postDate._cdata = formatDay())
      : checkHour
      ? (job.postDate._cdata = formatHour())
      : (job.postDate._cdata = 'None Listed')

    job.title._cdata = $(elem).find('.arJobTitle h3').text()
    job.company._cdata = $(elem).find('.arJobCoLink').text().trim()

    const companyURL = $(elem).find('.arJobCoLink a').attr('href')
    companyURL
      ? (job.companyURL._cdata = companyURL)
      : (job.companyURL._cdata = 'None Listed')

    job.location._cdata = $(elem).find('.arJobCoLoc').text().trim()
    job.shortDesc._cdata = $(elem)
      .find('.arJobSummary a')
      .text()
      .replace(/\n/g, ' ')
      .replace(/\t/g, '')
      .trim()

    let summaryURL = $(elem).find('.arJobSummary a').attr('href')
    summaryURL = baseURL + summaryURL

    summaryURL
      ? (job.summaryURL._cdata = summaryURL)
      : (job.summaryURL._cdata = 'None Listed')

    if (summaryURL)
      job.fullDesc._cdata = getDetails(summaryURL).then(
        (res) => (job.fullDesc._cdata = res)
      )

    // if (summaryURL.includes('spotlight')) console.log(job.fullDesc)

    let jobID = summaryURL.split('-')
    const last = jobID.length
    jobID = jobID[last - 2]
    if (jobID) job.ID._cdata = jobID

    jobArr.push(job)
  })

  if (n < lastPage) {
    process.stdout.write(' Current Pg:')
    process.stdout.write(` ${n}`)
    process.stdout.cursorTo(0)
    n++
    getJobs()
  } else {
    allJobs = [...new Map(jobArr.map((m) => [m.ID._cdata, m])).values()]
    formatJSON(allJobs)
    formatXML(allJobs)
  }
}

getJobs()

app.listen(PORT, () =>
  console.log(`Serving Up Constructive Results on PORT: ${PORT} 👷‍♀️`)
)

// Transferred Code from Old Repo
// Original Axios URLs Have Been Changed
