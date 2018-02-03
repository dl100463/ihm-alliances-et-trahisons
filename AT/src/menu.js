/**
 * @author Loïc Dalian
 * @author Matthieu Barzellino
 */

// Import JQuery
import $ from 'jquery/dist/jquery.min';
import QRCode from 'qrcode';
import GameCore from './gameCore';

let widgets = [];

// function addWidgetToScreen(widget) {
// //  $('#example-container').append(widget.domElem);
//   widget.addTo('#example-container');
//   widgets.push(widget);
// }// AddWidgetToScreen()

function removeWidgets() {
  $('#example-container').empty();
  for (let i = 0; i < widgets.length; i += 1) {
    widgets[i].deleteWidget();
  }
  widgets = [];
}

function buildGame(core) {
  removeWidgets();

  core.initMap();
  core.initPlayers();
  core.initPlanets();
  core.addMenu();
  core.startGame();
}

function listenForLobbyCompletion(core) {
  core.client.socket.on('play', () => {
    buildGame(core);
  });
}

export default function buildMenu() {
  const core = new GameCore();
  core.initFirstPlanets();

  $('#example-container').append('<h1> Alliances et Trahisons</h1>');
  $('#example-container').append('<div align="center" style="margin:50px;"><canvas id="canvas"></canvas></div>');
  QRCode.toCanvas(document.getElementById('canvas'), 'localhost');

  $('#example-container').append('<button id="user-test" class="menu-button"> Lancer le jeu </button></br>');

  listenForLobbyCompletion(core);

  $('#user-test').on('click', () => {
    buildGame(core);
  });
}
