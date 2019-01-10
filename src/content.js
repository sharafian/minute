const uuid = require('uuid/v4')
const paymentPointerSelector = 'meta[name=\'monetization:paymentpointer\']'

function getWebMonetizationDetails () {
  const paymentPointerElement = document.head
    .querySelector(paymentPointerSelector)

  if (!paymentPointerElement) {
    return
  }

  // TODO: validate payment pointer by regex
  const paymentPointer = paymentPointerElement.getAttribute('content')
  return {
    paymentPointer
  }
}

document.addEventListener('readystatechange', ev => {
  if (event.target.readyState === 'interactive') {
    const details = getWebMonetizationDetails()

    // return if there are no web monetization tags
    if (!details) {
      return
    }

    const correlationId = uuid()

    // Indicate that meta tags have been processed and payment will be
    // attempted
    document.dispatchEvent(new CustomEvent('monetizationload', {
      detail: Object.assign({
        correlationId
      }, details)
    }))

    const request = Object.assign({
      command: 'pay',
      correlationId
    }, details)

    chrome.runtime.sendMessage(request, result => {
      if (result.error) {
        console.error(result.error)
        return
      }

      // Indicate that payment has started.
      // First nonzero packet has been fulfilled
      injectWebMonetizationStatus('started').then(() => {
        document.dispatchEvent(new CustomEvent('monetizationstart', {
          detail: Object.assign({
            correlationId
          }, details)
        }))
      })
    })
  }
})

function injectWebMonetizationStatus (status) {
  // set flag to indicate web monetization is supported
  const script = document.createElement('script')
  script.innerHTML = 'document.monetizationStatus = ' + JSON.stringify(status)
  document.documentElement.appendChild(script)

  // clean it up afterwards
  return new Promise(resolve => {
    script.addEventListener('load', () => {
      document.documentElement.removeChild(script)
      resolve()
    })
  })
}

injectWebMonetizationStatus('pending')
