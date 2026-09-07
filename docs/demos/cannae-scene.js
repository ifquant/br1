/* Classic-script tactical schematic for local file:// documentation playback. */
(function () {
  'use strict';

  var LOOP_SECONDS = 12;
  var BASE_W = 480;
  var BASE_H = 270;
  var phaseText = [
    { heading: 'Pressure', copy: 'Rome presses the outward-bulging Carthaginian centre while African veterans hold the wings.', subtitle: 'Rome presses the bowed centre.' },
    { heading: 'Yield', copy: 'The Spanish and Celtic centre gives ground under Roman pressure, drawing Rome between the African flanks.', subtitle: 'The centre gives ground; Rome enters.' },
    { heading: 'Pivot', copy: 'African veterans face inward onto both Roman flanks as the centre continues to give ground.', subtitle: 'African wings turn onto both flanks.' },
    { heading: 'Close', copy: 'After defeating enemy horse, Hasdrubal’s cavalry reaches Rome’s rear; the formation is enclosed.', subtitle: 'Cavalry reaches the rear after horse victory.' }
  ];
  var colors = {
    ground: '#dbe1d7', band: '#f0f3ee', ink: '#26343a', muted: '#637177',
    rome: '#3477a3', carthage: '#b3433e', african: '#725c95', cavalry: '#4f8f87'
  };
  var cavalryRoute = [{ x: 395, y: 65 }, { x: 355, y: 45 }, { x: 210, y: 45 }, { x: 240, y: 90 }, { x: 246, y: 132 }];

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function ease(value) { return value * value * (3 - 2 * value); }
  function between(from, to, progress) { return from + (to - from) * ease(clamp(progress, 0, 1)); }
  function point(from, to, progress) { return { x: between(from.x, to.x, progress), y: between(from.y, to.y, progress) }; }

  function label(ctx, value, x, y, color, align, size) {
    ctx.fillStyle = color || colors.ink;
    ctx.font = '600 ' + (size || 8) + 'px system-ui, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
  }

  function arrow(ctx, from, to, color) {
    var angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 7 * Math.cos(angle - 0.45), to.y - 7 * Math.sin(angle - 0.45));
    ctx.lineTo(to.x - 7 * Math.cos(angle + 0.45), to.y - 7 * Math.sin(angle + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function block(ctx, position, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(position.x - width / 2, position.y - height / 2, width, height);
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(position.x - width / 2, position.y - height / 2, width, height);
  }

  function drawCentre(ctx, bulge) {
    // Segment positions make the changing convex/concave line visible instead of implying it with one block.
    [87, 100, 113, 126, 139, 152, 165, 177].forEach(function (y) {
      var normalized = (y - 132) / 45;
      var x = 290 + bulge * Math.sqrt(Math.max(0, 1 - normalized * normalized));
      block(ctx, { x: x, y: y }, 11, 9, colors.carthage);
    });
  }

  function drawBands(ctx) {
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.fillStyle = colors.band;
    ctx.fillRect(0, 0, BASE_W, 34);
    ctx.fillRect(0, 224, BASE_W, 46);
    ctx.strokeStyle = '#bac5bc';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(BASE_W, 34); ctx.moveTo(0, 224); ctx.lineTo(BASE_W, 224); ctx.stroke();
    label(ctx, 'CANNAE | DOUBLE ENVELOPMENT', 12, 14, colors.ink, 'left', 15);
    label(ctx, 'SCHEMATIC / NOT TO SCALE', 468, 13, colors.ink, 'right', 8);
    label(ctx, 'Source: Polybius III', 12, 27, colors.muted, 'left', 8);
    label(ctx, 'map geometry approximate / inferred', 468, 27, colors.muted, 'right', 8);
  }

  function drawCaption(ctx, phase) {
    var item = phaseText[phase];
    label(ctx, item.heading.toUpperCase(), 12, 241, colors.ink, 'left', 13);
    label(ctx, item.subtitle, 12, 258, colors.ink, 'left', 11);
  }

  function wing(ctx, phase, progress, upper) {
    var start = upper ? { x: 300, y: 63 } : { x: 300, y: 201 };
    var end = upper ? { x: 287, y: 91 } : { x: 287, y: 173 };
    if (phase < 2) return block(ctx, start, 14, 35, colors.african);
    var position = phase === 2 ? point(start, end, progress) : end;
    var width = phase === 2 ? between(14, 80, progress) : 80;
    var height = phase === 2 ? between(35, 14, progress) : 14;
    block(ctx, position, width, height, colors.african);
  }

  function cavalryPosition(progress) {
    var scaled = clamp(progress, 0, 1) * (cavalryRoute.length - 1);
    var index = Math.min(cavalryRoute.length - 2, Math.floor(scaled));
    return point(cavalryRoute[index], cavalryRoute[index + 1], scaled - index);
  }

  function drawCavalry(ctx, phase, progress) {
    if (phase < 3) return block(ctx, cavalryRoute[0], 18, 12, colors.cavalry);
    // The route remains outside the infantry, then reaches Rome's rear at x=246 (its block touches x=252).
    for (var index = 0; index < cavalryRoute.length - 1; index += 1) arrow(ctx, cavalryRoute[index], cavalryRoute[index + 1], colors.cavalry);
    var motion = clamp(progress * 3 / 2, 0, 1); // Arrive at 11s and hold the closing formation for the final second.
    block(ctx, cavalryPosition(motion), 12, 12, colors.cavalry);
  }

  function drawFormation(ctx, phase, progress) {
    var roman;
    var bulge;
    if (phase === 0) {
      roman = point({ x: 175, y: 132 }, { x: 208, y: 132 }, progress);
      bulge = -45;
      arrow(ctx, { x: 175, y: 132 }, { x: 208, y: 132 }, colors.rome);
    } else if (phase === 1) {
      roman = point({ x: 208, y: 132 }, { x: 287, y: 132 }, progress);
      bulge = between(-45, 35, progress);
      arrow(ctx, { x: 208, y: 132 }, { x: 287, y: 132 }, colors.rome);
    } else {
      roman = { x: 287, y: 132 };
      bulge = 35;
    }
    block(ctx, roman, 70, 66, colors.rome);
    drawCentre(ctx, bulge);
    wing(ctx, phase, progress, true);
    wing(ctx, phase, progress, false);
    drawCavalry(ctx, phase, progress);
    label(ctx, 'Rome', roman.x, 208, colors.rome, 'center', 9);
    label(ctx, 'Carthage', 414, 48, colors.carthage, 'center', 9);
    label(ctx, 'African wings', 350, 208, colors.african, 'center', 8);
    label(ctx, 'Cavalry', 395, 82, colors.cavalry, 'center', 8);
  }

  function phaseAt(time) {
    var safe = ((Number(time) % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
    return { index: Math.min(3, Math.floor(safe / 3)), progress: (safe % 3) / 3 };
  }

  window.cannaePhase = function (time) {
    var item = phaseText[phaseAt(time).index];
    return { heading: item.heading, copy: item.copy };
  };

  window.drawCannaeScene = function (ctx, time, width, height) {
    var state = phaseAt(time);
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.scale(width / BASE_W, height / BASE_H);
    drawBands(ctx);
    drawFormation(ctx, state.index, state.progress);
    drawCaption(ctx, state.index);
    ctx.restore();
  };
}());
