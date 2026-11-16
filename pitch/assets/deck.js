// Navigation du deck : ← / → (ou Espace, Page précédente / suivante), Début / Fin, F pour le plein écran.
// L'URL garde la diapositive courante (#3), ce qui permet de reprendre ou de partager une page précise.
;(function () {
  const deck = document.querySelector('.deck')
  const slides = Array.from(document.querySelectorAll('.slide'))
  const counter = document.querySelector('.counter')
  const total = slides.length
  const pad = (n) => String(n).padStart(2, '0')

  slides.forEach((slide, index) => {
    const brand = document.createElement('header')
    brand.className = 'slide-brand'
    brand.innerHTML = '<img src="assets/brand/mark.svg" alt="" /><span>Dandelion</span>'
    const meta = document.createElement('p')
    meta.className = 'slide-meta'
    meta.textContent = 'Hackathon Open Data · 14 novembre 2026'
    const number = document.createElement('p')
    number.className = 'slide-number'
    number.textContent = `${pad(index + 1)} / ${pad(total)}`
    slide.prepend(brand)
    slide.append(meta, number)
  })

  let current = 0

  const show = (index) => {
    current = Math.max(0, Math.min(total - 1, index))
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === current)
      slide.setAttribute('aria-hidden', String(i !== current))
    })
    counter.textContent = `${current + 1} / ${total}`
    history.replaceState(null, '', `#${current + 1}`)
  }

  const fit = () => {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
    deck.style.transform = `translate(-50%, -50%) scale(${scale})`
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) show(current + 1)
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) show(current - 1)
    else if (event.key === 'Home') show(0)
    else if (event.key === 'End') show(total - 1)
    else if (event.key === 'f' || event.key === 'F') toggleFullscreen()
    else return
    event.preventDefault()
  })

  document.querySelector('.controls').addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.go
    if (action === 'next') show(current + 1)
    else if (action === 'prev') show(current - 1)
    else if (action === 'fullscreen') toggleFullscreen()
  })

  window.addEventListener('resize', fit)
  fit()
  show(Number.parseInt(location.hash.slice(1), 10) - 1 || 0)
})()
