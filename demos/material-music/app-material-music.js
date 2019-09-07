import {promiseLoad, isLoaded, parseBgUrl} from '../../src/js/animations/ImageDescriptor.js'
//import {hexToRgb/*, accentAverage*/} from '../../node_modules/iridescent/index.mjs'
function hexToRgb(hex) {
	var bigint = parseInt(hex, 16)
	var r = (bigint >> 16) & 255
	var g = (bigint >> 8) & 255
	var b = bigint & 255
	return {r, g, b}
}


import {albums, artists} from '../data-music.js'
export {albums, artists} from '../data-music.js'

export var listView = document.querySelector('#list-view')
export var detailView = document.querySelector('#detail-view')

export function promiseImageLoaded(img) {
	if (img.localName !== 'img') {
		var bgImage = window.getComputedStyle(img).backgroundImage
		img = new Image
		img.src = parseBgUrl(bgImage)
	}
	if (isLoaded(img))
		return undefined
		//return Promise.resolve()
	else
		return promiseLoad(img)
}

async function fadeInNotLoadedImg(node, duration = 100, delay = 0, fill = 'both') {
	var promise = promiseImageLoaded(node)
	if (promise) {
		node.style.opacity = 0
		await promise
		var options = {duration, delay, fill}
		var animation = node.animate({opacity: [0, 1]}, options)
		await animation.finished
		node.style.opacity = 1
		animation.cancel()
	}
}

async function fadeInWhenLoadedImg(node, duration = 100, delay = 0, fill = 'both') {
	node.style.opacity = 0
	await promiseImageLoaded(node)
	var options = {duration, delay, fill}
	var animation = node.animate({opacity: [0, 1]}, options)
	await animation.finished
	node.style.opacity = 1
	animation.cancel()
}

export function getUrl(url) {
	return `../img/${url}`
}

export function renderGrid(albums) {
	//<div ratio="1:1" cover style="background-image: url('./img/albums/${album.photo}')albums/"></div>
	var grid = document.querySelector('[grid]')
	grid.innerHTML = getAlbumsGridHtml(albums)

	Array.from(grid.children).forEach(async (node, i) => {
		var hex = node.getAttribute('primary')
		setTint(node, hex)
		var img = node.querySelector('img, [cover]')
		if (img) fadeInNotLoadedImg(img)
	})
}

export function renderDetail(album) {
	var detailView = document.querySelector('#detail-view')
	var artist = artists.find(artist => artist.name === album.artist)
	if (artist) {
		detailView.style.backgroundImage = `url('${getUrl(artist.photo)}')`
		detailView.style.backgroundSize = 'cover'
		detailView.style.backgroundPosition = 'center'
		//detailView.style.backgroundAttachment = 'fixed'
		//fadeInNotLoadedImg(detailView)
	} else {
		detailView.style.backgroundImage = ''
	}
	renderAlbumSongs(album)
	renderAlbumInfo(album)
}

export function setTint(node, hex) {
	var rgb = hexToRgb(hex.replace('#', ''))
	var rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b}`
	node.style.setProperty('--theme-tint-bg', rgbString)
	node.style.setProperty('--tint-bg', rgbString)
}

export function renderAlbumInfo(album) {
	var detailView = document.querySelector('#detail-view')
	var albumName = detailView.querySelector('#album-name')
	var albumArtist = detailView.querySelector('#album-artist')
	var albumArt = detailView.querySelector('#album-art, img')
	var albumRelease = detailView.querySelector('#album-release')
	albumName.innerText = album.name
	albumArtist.innerText = album.artist
	albumRelease.innerText = 'Released March, 2013'
	detailView.style.backgroundColor = album.color
	if (albumArt.localName === 'img')
		albumArt.src = getUrl(album.photo)
	else
		albumArt.style.backgroundImage = `url('${getUrl(album.photo)}')`
	fadeInNotLoadedImg(albumArt)
	setTint(detailView, album.color)
}

export function renderAlbumSongs(album) {
	if (!album.songs) return
	var detailView = document.querySelector('#detail-view')
	var table = detailView.querySelector('table')
	var tracklistHtml = getAlbumSongsHtml(album)
	table.innerHTML = tracklistHtml
}


export function getAlbumsGridHtml(albums) {
	return albums.map(album => `
		<div primary="${album.color}" tinted colspan="${album.colspan}" rowspan="${album.rowspan}">
			<div ratio="1:1">
				<img fit cover src="${getUrl(album.photo)}" style="opacity:0">
			</div>
			<div class="album-info" layout>
				<div vertical layout flex>
					<p>${album.name || ''}</p>
					<p body2>${album.artist || ''}</p>
				</div>
				<icon>star_outline</icon>
			</div>
		</div>
	`).join('\n')
}

export function getAlbumSongsHtml(album) {
	var headerHtml = `
		<tr hidden="s">
			<th text="left">Track</th>
			<th text="left">Artist</th>
			<th text="right">Length</th>
		</tr>
	`

	if (!album.songs) return headerHtml

	var tracksHtml = album.songs.map((track, i) => `
		<tr>
			<td>
				<span style="display: inline-block; width: 32px">${i + 1}</span>
				${track.name}
			</td>
			<td hidden="s">${album.artist}</td>
			<td text="right">${track.length}</td>
		</tr>
	`).join('\n')

	return headerHtml + '\n' + tracksHtml
}