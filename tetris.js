// Author: Jesse Jacobsen

// --------------------------------------------------------------------------------  
                                  // Helper Functions
// -------------------------------------------------------------------------------- 

// ---------- PieceState ----------

// Describes a piece, its rotation, and its position
var PieceState = function(piece, rotation, position) { 
	if (typeof piece === 'number' && piece >=0 && piece <= 6) { this.piece = piece; }
	else { this.piece = 0; }
	if (typeof rotation === 'number' && rotation >=0 && rotation <= 3) { this.rotation = rotation; }
	else { this.rotation = 0; }
	this.position = position;
};

PieceState.prototype.clone = function() {
	var n = new PieceState();
	n.piece = this.piece;
	n.rotation = this.rotation;
	n.position = new Position( this.position.x, this.position.y );
	return n;
};

// ---------- Position ----------

// 2D vector describing position
var Position = function(x, y) { 
	if (typeof x === 'number') { this.x = x; }
	else { this.x = 0; }
	if (typeof y === 'number') { this.y = y; }
	else { this.y = 0; }
};

// ---------- Range ----------

// 2D vector describing a range
var Range = function(min, max) { 
	if (typeof min === 'number') { this.min = min; }
	else { this.min = 0; }
	if (typeof max === 'number') { this.max = max; }
	else { this.max = 0; }
	// reverse min and max if min > max
	if (min > max) {
		var temp = this.max;
		this.max = this.min; 
		this.min = temp; 
	}
	this.range = this.max - this.min;
};

// ---------- getRand() ----------

function getRand(a, b) {
	return Math.floor( (b - a + 1) * Math.random() ) + a;
}

// ---------- NumberBag ----------

// Generates an array of random unique numbers between a range
// kinda like sticking numbered tokens into a bag
var NumberBag = function(min, max) {
	this.bagRange = new Range(min, max);
	this.bag = [];  // Array which holds generated numbers
};
// Generates a new sequence of numbers
NumberBag.prototype.fill = function() {
	var isUnique, rand;
	// Loop until bag is full
	for (var i = 0; i <= this.bagRange.range; i++) {
		do {
			isUnique = true;
			rand = getRand(this.bagRange.min, this.bagRange.max);
			// Check if generated number is already in bag
			for (var j = 0; j < this.bag.length; j++) {
				if (this.bag[j] === rand) {
					isUnique = false;
					break;
				}
			}
		} while (!isUnique);
		this.bag.push(rand); // Add number to bag
	}
};
// Returns next number in bag, then removes it
NumberBag.prototype.getNext = function() {
	// Fill bag if it is empty
	if (this.bag.length === 0) {
		this.fill();
	}
	return this.bag.shift();
};

// ---------- PadDigits ----------
function padDigits(n, totalDigits) { 
    n = n.toString(); 
    var pad = ''; 
    if (totalDigits > n.length) 
    { 
        for (i=0; i < (totalDigits-n.length); i++) 
        { 
            pad += '0'; 
        } 
    } 
    return pad + n.toString(); 
}


// --------------------------------------------------------------------------------  
                                  // board
// -------------------------------------------------------------------------------- 

var board = {
	board : [],
	
	// Based on Tetris Guideline SRS (Super Rotation System) found Here:
	// http://www.tetrisconcept.net/wiki/SRS
	IWallKickTranslations : [
		[[ 0, 0],[-1, 0],[ 2, 0],[-1, 0],[ 2, 0]], 
		[[-1, 0],[ 0, 0],[ 0, 0],[ 0, 1],[ 0,-2]], 
		[[-1, 1],[ 1, 1],[-2, 1],[ 1, 0],[-2, 0]], 
		[[ 0, 1],[ 0, 1],[ 0, 1],[ 0,-1],[ 0, 2]]  
	],
	otherWallKickTranslations : [
		[[ 0, 0],[ 0, 0],[ 0, 0],[ 0, 0],[ 0, 0]], 
		[[ 0, 0],[ 1, 0],[ 1,-1],[ 0, 2],[ 1, 2]],
		[[ 0, 0],[ 0, 0],[ 0, 0],[ 0, 0],[ 0, 0]], 
		[[ 0, 0],[-1, 0],[-1,-1],[ 0, 2],[-1, 2]] 
	],
	OWallKickTranslations : [
		[[ 0, 0]],
		[[ 0,-1]], 
		[[-1,-1]], 
		[[-1, 0]]  
	],
	checkOpen : function(state, increment) {
		var test = state.clone(); // test piece
		test.position.y += increment;
		
		if ( board.isPossibleMovement( test ) ) {
			return true;
		}
		return false;
	},
	// Returns a valid state of a piece rotated in a direction,
	// performs wall kick if needed, otherwise returns original state
	checkRotation : function(state0, dir) {
		var state1 = state0.clone(); // used for testing positions
		var newRotation, offsetX, offsetY;
		var translateA, translateB;
		var checkArray = [];
		// get target rotation
			if (dir === 'cw') {
				newRotation = state0.rotation + 1;
				if (newRotation > 3) { newRotation = 0; }
			} else {
				newRotation = state0.rotation - 1;
				if (newRotation < 0) { newRotation = 3; }
		}
		
		// apply target rotation to test piece
		state1.rotation = newRotation;
		
		// continue on if invalid rotation
		// get proper translation arrays
		switch(state1.piece) {
			case 0:
				checkArray = this.IWallKickTranslations;
				break;
			case 3:
				checkArray = this.OWallKickTranslations;
				break;
			default:
				checkArray = this.otherWallKickTranslations;
				break;
		}
		
		translateA = checkArray[state0.rotation];
		translateB = checkArray[newRotation];
		
		// test each shifted position for a valid one
		for (var i = 0; i < translateA.length; i++) {
			// offset is difference of translation values
			offsetX = translateA[i][0] - translateB[i][0];
			offsetY = translateA[i][1] - translateB[i][1];
			
			state1.position.x += offsetX;
			state1.position.y -= offsetY;
			
			// see if it works, or reset and try again
			if (this.isPossibleMovement(state1)) {
				return state1;
			} else {
				state1 = state0.clone();
				state1.rotation = newRotation;
			}
		}
		
		// return original if it can't find valid position
		return state0;
	},
	deleteLine : function(y) {
		for ( var j = y; j >= 0; j--) {
			for (var i = 0; i < 10; i++) {
				if ( j !== 0 ) {
					this.board[j][i] = this.board[j-1][i];
				} else {
					this.board[j][i] = 0;
				}				
			}
		}
	},
	deletePossibleLines : function() {
	var deletedLines = [];
		for (var i = 0; i < 22; i++) {
			for (var j = 0; j < 10; j++) {
				if ( this.board[i][j] === 0 ) {
					break;
				} else {
					if (j === 9) {
						deletedLines.push( i );
						this.deleteLine( i );
					}
				}
			}
		}
		
		return deletedLines;
		
	},
	init : function() {
		for (var i=0; i<22; i++) {
			this.board[i] = [];
			
			for (var j=0; j<10; j++) {
				this.board[i][j] = 0;
			}
		}
//		this.board = [
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[0,0,0,0,0,0,0,0,0,0],
//		[1,1,1,1,1,1,0,1,1,1],
//		[1,0,1,1,1,1,1,1,1,1],
//		[1,1,1,1,1,1,1,1,0,1]
//		];
	},
	isFreeBlock : function(x, y) {
		if (!this.board[y][x] && this.board[y][x] === 0) {
			return true;
		}
		return false;
	},
	isGameOver : function() {
		for (var i=0; i<22; i++) {
			if (this.board[0][i] === 1 || this.board[1][i] === 1) {
				return true;
			}
		}
		return false;
	},
	isPossibleMovement : function(state) {
		var pieceSize = pieces.getSize(state.piece);
		for (var j = 0; j < pieceSize; j++) {
			for (var i = 0; i < pieceSize; i++) {
				if ( pieces.isBlock( state.piece, state.rotation, i, j ) ) {
					var bx = state.position.x + j; // board x position
					var by = state.position.y + i; // board y position
					
					// Collides with walls
					if (bx < 0 || bx > 9 || by < 0 || by > 21) {
						return false;
					}
					
					// Collides with block on board
					if ( !this.isFreeBlock( bx, by ) ) {
						return false;
					}
				}
			}
		}
		return true; // no collision
	},
	isTSpin : function(state) {
		// piece must be T for TSPin
		if (state.piece !== 6) {
			return false;
		}
		
		// check to see if at least three corner blocks are occupied		
		var x, y;
		var occupiedPositions = 0;
		var checkPositions = [[0,0],[2,0],[0,2],[2,2]];
		
		for (var i = 0; i<checkPositions.length; i++) {
			x = state.position.x + checkPositions[i][0];
			y = state.position.y + checkPositions[i][1];

			if (!this.isFreeBlock(x, y)) {
				if (++occupiedPositions >=3) {
					return true;
				}
			}
		}
		
		return false;
	},
	isTwist : function(state) {
		// check if piece cannot move left, right, or up
		var checkPositions = [[-1,0], [1,0], [0,-1]];
		var test = state.clone();
		
		for (var i = 0; i < checkPositions.length; i++) {
			test.position.x = state.position.x + checkPositions[i][0];
			test.position.y = state.position.y + checkPositions[i][1];
			
			if (this.isPossibleMovement(test)) {
				return false;
			} 
		}
		return true;
	},
	reset : function() {
		this.init();
	},
	storePiece : function(state) {
		var pieceSize = pieces.getSize(state.piece);
		var x = state.position.x;
		var y = state.position.y;
		
		for (var i = 0; i < pieceSize; i++) {
			for (var j = 0; j < pieceSize; j++) {
				if (pieces.isBlock(state.piece, state.rotation, j, i)) {
				//	console.log(state.piece);
					this.board[y+j][x+i] = state.piece+1;
				}
			}
		}
	}
};

// --------------------------------------------------------------------------------  
                                  // game
// --------------------------------------------------------------------------------

var game = {
	gamepossible	: false,
	gamestate	   : false,
	canHold        : true,
	currentState   : new PieceState(), // Currrent piece's PieceState
	heldPiece      : -1,
	lastMoveRotate : false,
	
	mode           : 'drop', // modes = drop, lockDelay, spawnDelay, settings, paused
	nextPieces     : [],
	nextDepth      : 5,
	pieceBag       : new NumberBag(0,6),
	previousMode1  : '',
	previousMode2  : '', 
	
	
	advancePieces : function() {
		this.currentState.piece = this.nextPieces[0];
		
		for (var i=0; i<this.nextDepth; i++) {
			this.nextPieces[i] = this.nextPieces[i+1]
		}
		
		this.nextPieces[this.nextDepth-1] = this.pieceBag.getNext();
	},
	dropPiece : function() {
		if (board.checkOpen(this.currentState, 1)) {
			this.currentState.position.y++;
			this.lastMoveRotate = false;
		} else {
			this.mode = 'lockDelay';
		}
		
		graphics.positionPiece( this.currentState, 'current' );
		
		score.dropType = 0;
	},
	gameOver : function() {
		this.mode = 'gameOver';
		gamestate = false;
		if(fightstate) {
		
		//	graphics.toggleGameLose('show');
			w.send(playerNumber+'@gameover');
			
		//	wait(3000);
		//	graphics.toggleGameLose('hide');
			graphics.toggleGameRejoin('show');
		}
		else {
			graphics.toggleGameOver('show');
			
		
		}
	},
	hardDrop : function() {
		var linesDropped = 0;
		
		while (board.checkOpen(this.currentState, linesDropped)) {
			linesDropped++;

		}
		
		this.currentState.position.y += linesDropped-1;
		graphics.positionPiece(this.currentState, 'current');
		
		if (settings.enableHardDropAnimation) {
			graphics.hardDrop(this.currentState.position.x,
				this.currentState.position.y,
				linesDropped)
		}
		
		this.lastMoveRotate = false;
		this.lockPiece();
		score.addHardDropBonus(linesDropped);
		stats.values.HardDrops++;
},
	lockPiece : function() {
		var deletedLines, scoreIncrease, lineClearValue, leveledUp;
		
		// check for TSpins and twists before deleting lines
		if ( this.lastMoveRotate && board.isTSpin(this.currentState) ) {
			score.type = 'tspin';
		} else if (board.isTwist(this.currentState)) {
			score.type = 'twist';
		}
		
		board.storePiece( this.currentState );
		graphics.lockPiece();
		graphics.hideGhostBlocks();
		
		deletedLines = board.deletePossibleLines();
	
		
				
	
		/*for(var i=0;i<22;i++) {
				var str=[];
			for(var j=0;j<10;j++) {
				str.push(board.board[i][j]);
			}
			console.log(str);
		}*/
		if (deletedLines.length > 0) {
			
			graphics.deleteLines(deletedLines);
			score.lines = deletedLines.length;
			if (score.type === '') {
				score.type = 'lineclear';
			}
			
			
		}
		
		scoreIncrease = score.increase();
		lineClearValue = score.getLineClearValue();
		leveledUp = levels.adjustLines(lineClearValue);
		
		if (scoreIncrease > 0 && settings.enableScorePopAnimation) {
			graphics.popScore({
				position: this.currentState.position,
				lineClearValue: lineClearValue,
				moveName: score.getMoveName(),
				scoreIncrease: scoreIncrease,
				comboCount: score.comboCount,
				leveledUp: leveledUp
			});
		}
		
		
		
		if (lineClearValue >= 1) {
			score.setPrevious();
		}
		score.resetTemp();
		
		graphics.updateLevelData(levels.lines, levels.toNext, levels.currentLevel);
		
		this.mode = 'spawnDelay';
		if ( board.isGameOver() ) {
			this.gameOver();
		}
		
	},
	init : function() {
		board.init();
		
		input.init();
		
		graphics.init();
		
		
	},
	pause : function() {
		if (this.mode === 'stats') {
			return false;
		}
		if ( this.mode === 'paused' ) {
			this.mode = this.previousMode1;
			graphics.togglePause('hide');
		} else {
			this.previousMode1 = this.mode;
			this.mode = 'paused';
			graphics.toggleGameWin('show');
		}
	},
	restart : function() {
		this.heldPiece = -1;
		
		for(var i=0;i<attack.attackmsg.length;i++) {
			attack.attackmsg.pop();
			attack.attackblank.pop();
		}
		score.reset();
		levels.reset();
		board.reset();
		graphics.reset();
		main.resetCounter();
		main.resetGameTime();
				
		this.mode = 'drop';
		this.start();
	},
	rotatePiece : function(dir) {		
		this.currentState = board.checkRotation(this.currentState, dir);
		
		this.updateGhost();
		graphics.positionPiece( this.currentState, 'current' );
		
		if (this.mode === 'lockDelay') {
			main.counter = 0;
		}
		this.lastMoveRotate = true;
		stats.values.Rotations++;
	},
	slidePiece : function(dir) {
		var test = this.currentState.clone();
		
		switch ( dir ) {
			case 'left' : 
				test.position.x--;
			break;
			case 'right' :
				test.position.x++;
			break;
		}
		
		if ( board.isPossibleMovement( test ) ) {
			this.currentState = test;
		}
		
		this.updateGhost();
		graphics.positionPiece( this.currentState, 'current' );
		
		if (this.mode === 'lockDelay') {
			main.counter = 0;
		}
		this.lastMoveRotate = false;
	},
	softDrop : function() {
		var test = this.currentState.clone();
		
		test.position.y++;
		
		if ( this.mode === 'drop' ) {
			this.dropPiece();
		} else if ( this.mode === 'lockDelay' ) {
			this.lockPiece();
		}
		
		graphics.positionPiece( this.currentState, 'current' );
		
		score.addSoftDropBonus();
		this.lastMoveRotate = false;
		stats.values.SoftDrops++;
	},
	spawnPiece : function(p) {
		
		var currentpiece=game.nextPieces[0];
		
		this.advancePieces();
		
		this.currentState.rotation = 0;
		this.currentState.position = pieces.getInitialPosition( this.currentState.piece );
		
		graphics.createPiece( this.currentState.piece );
		graphics.positionPiece(  this.currentState, 'current' );
		graphics.showGhostBlocks();
		graphics.updateNextPieces( this.nextPieces );
		
		this.mode = 'drop';
		
		this.canHold = true;
		
		this.updateGhost();
		
		if ( !board.isPossibleMovement( this.currentState ) ) { this.gameOver(); }
		stats.values.Tetriminos++;
		w.send(playerNumber+'@piece@'+currentpiece+game.nextPieces[0]+game.nextPieces[1]+game.nextPieces[2]+game.nextPieces[3]+game.nextPieces[4]+game.heldPiece);
		
		
		if(inputspace===true) {
		w.send(playerNumber+'@input@space');
		inputspace=false;
		}
		
		var boardstring='';
		for(var i=0;i<22;i++) {
			for(var j=0;j<10;j++) {
				boardstring+=board.board[i][j];
			}
		}
		w.send(playerNumber+'@board@'+boardstring);
		for(var i=0;i<attack.attackmsg.length;i++) {
		attack.createLineUp(attack.attackmsg.pop(),attack.attackblank.pop());
		
		}
		
	},
	start : function() {
		levels.setLevel( settings.startLevel );
		
		graphics.updateLevelData(0, levels.toNext, 1);
		graphics.updateScore(0);
		
		for (var i = 0; i<this.nextDepth; i++) {
			this.nextPieces[i] = this.pieceBag.getNext();
		}
		
		console.log(''+this.nextPieces[0]+this.nextPieces[1]+this.nextPieces[2]+this.nextPieces[3]+this.nextPieces[4]);
		
		this.spawnPiece();
		graphics.toggleGameStart('hide');
	},
	swapHoldPiece : function() {
		if (this.canHold) {
			// set hold piece as current piece
			// set current piece as hold piece if there is one
			// if there isn't, then set current as next
			// graphics.updateHoldPiece
			var currentpiece=game.nextPieces[0];
			var temp = this.heldPiece;
			this.heldPiece = this.currentState.piece;
			
			if ( temp !== -1 ) {
				this.currentState.piece = temp;
			} else {
				graphics.showHeldBlocks();
				this.advancePieces();
				graphics.updateNextPieces( this.nextPieces );
			}
			
			graphics.updateHeldPiece( this.heldPiece );
			
			this.currentState.rotation = 0;
			this.currentState.position = pieces.getInitialPosition( this.currentState.piece );
			
			graphics.createPiece( this.currentState.piece );
			graphics.positionPiece(  this.currentState, 'current' );
			graphics.showGhostBlocks();
			
			this.mode = 'drop';
			
			this.updateGhost();
			
			this.canHold = false;
			w.send(playerNumber+'@piece@'+currentpiece+game.nextPieces[0]+game.nextPieces[1]+game.nextPieces[2]+game.nextPieces[3]+game.nextPieces[4]+game.heldPiece);
		}
	},
	toggleSettings : function() {
		if (this.mode === 'stats') {
			return false;
		}
		if (this.mode !== 'settings') {
			this.previousMode2 = this.mode;
			
			$('.gameWindow').hide();
			graphics.toggleSettings('show');
			
			this.mode = 'settings';
		} else {
			graphics.toggleSettings('hide');
			if (this.previousMode2 === 'paused') {
				$('#pause').show();
			} else if(this.previousMode2 === 'gameOver'){
				$('#gameOver').show();
			}
			this.mode = this.previousMode2;
		}
	},
	toggleStats : function() {
		if (this.mode !== 'stats') {
			this.previousMode2 = this.mode;
			
			$('.gameWindow').hide();
			graphics.toggleStats('show');
			
			this.mode = 'stats';
		} else {
			graphics.toggleStats('hide');
			
			if (this.previousMode2 === 'paused') {
				$('#pause').show();
			} else if(this.previousMode2 === 'gameOver'){
				$('#gameOver').show();
			}
			this.mode = this.previousMode2;
		}
	},
	updateGhost : function() {
		var inc = 0;
		var ghost = this.currentState.clone();
		
		while (board.checkOpen(ghost, inc)) {
			inc++;
		}
		
		ghost.position.y += inc-1; 
		
		graphics.positionPiece( ghost, 'ghost' );
	}
};

// --------------------------------------------------------------------------------  
                                  // graphics
// --------------------------------------------------------------------------------

var graphics = {
	blockSize   : 0, 
	boardWidth  : 0,
	boardHeight : 0,
	boardPos    : 0,
	jBlocks : {
		current : [],
		ghost   : [],
		next    : [],
		hold    : []
	},
	holdOffset  : [-5,3],
	nextOffsets : [[11,3],[11,8],[11,11],[11,14],[11,17]],
	levelOffsets: [-5.7,5],
	scoreOffsets: [-5.3,8.3],
	
	createAnimations : function() {
		// create sparkles
		for (var i=1; i < 22; i++) {
			$(document.createElement('img'))
				.attr('src', 'img/sparkle.gif')
				.addClass('boardAnimation')
				.attr('id', 'sparkle' + i)
				.css({
					display: 'none',
					left: 0,
					top: (i-2) * this.blockSize,
					width: this.blockSize,
					height: this.blockSize
				})
				.appendTo('#board')
				.hide();
		}
	},
	createStartingBlocks : function() {
		for (var y = 0; y<22; y++) {
			for (x = 0; x<10; x++) {
				if (!board.isFreeBlock(x,y)) {
					$('#board').append($(document.createElement('img') )
					.attr('src', 'img/block-ghost.gif')
					.addClass('block onBoard line' + y)
					.css({
						top:    this.blockSize * (y-2),
						left:   this.blockSize * x,
						width:  this.blockSize,
						height: this.blockSize
					}))
				}
			}
		}
	},
	createPermanentBlocks : function() {
		for (var i = 0; i < 4; i++) {
			this.createJBlock({type : 'ghost'})
			this.createJBlock({type: 'hold'})
		}
		
		for (var j = 0; j < 5; j++) {
			this.jBlocks.next[j] = [];
			for (var i = 0; i < 4; i++) {
				this.createJBlock({type: 'next', next: j})
			}
		}
	},
	createJBlock : function(info) {
		if (info.color) {
			var src = 'img/block-' + info.color + '.gif';
		} else {
			var src = 'img/block-ghost.gif';
		}
		
		if (info.type === 'next') {
			var ar = this.jBlocks.next[info.next]
		} else {
			var ar = this.jBlocks[info.type]
		}
		
		var jBlock = $(document.createElement('img'))
		.attr('src', src)
		.addClass('block')
		.addClass(info.type)
		.width(this.blockSize)
		.height(this.blockSize)
		
		if (info.type === 'ghost') {
			jBlock.css('opacity', .5);
		}
		
		if (info.type !== 'current' || info.type !== 'next') {
			jBlock.hide();
		}
		
		ar.push(jBlock);
		$('#board').append(jBlock);
	},
	createPiece : function(piece) {
		this.jBlocks.current = [];
		for (var i = 0; i < 4; i++) {
			this.createJBlock({
				color: pieces.getColor( piece ),
				type: 'current'
			})
		}
	},
	createSettingsHandlers : function() {
		$('#settingsLink').click(function(){
			game.toggleSettings()
		});
		
		$('#okSettings').click(function(){
			game.toggleSettings()
		})
		$('#animateLevelUp').click(function() {
			settings.enableLevelUpAnimation = $(this).attr('checked');
		}).attr('checked', settings.enableLevelUpAnimation)
		
		$('#animateWallKick').click(function() {
			settings.enableWallKickAnimation = $(this).attr('checked');
		}).attr('checked', settings.enableWallKickAnimation)
		
		$('#animateHardDrop').click(function() {
			settings.enableHardDropAnimation = $(this).attr('checked');
		}).attr('checked', settings.enableHardDropAnimation)
		
		$('#animateClearLine').click(function() {
			settings.enableLineClearAnimation = $(this).attr('checked');
		}).attr('checked', settings.enableLineClearAnimation)
		
		$('#animateTetris').click(function() {
			settings.enableTetrisAnimation = $(this).attr('checked');
		}).attr('checked', settings.enableTetrisAnimation)
		
		$('#animateScorePop').click(function() {
			settings.enableScorePopAnimation = $(this).attr('checked');
		}).attr('checked', settings.enableScorePopAnimation)
	},
	deleteLines : function (lines) {
		//console.profile();
		var yMat = []; // list of distances to drop down blocks
		var newY;
		for (var i = lines.length; i>=0; i--) {
			if (settings.enableLineClearAnimation) {
				// remove lines
				console.log(lines[i]);
				$('.line' + lines[i]).each(function(){
					if (lines.length === 4 && settings.enableTetrisAnimation) {
						$(this).animate({
							left: '+=' + getRand(-200, 200),
							top: '+=' + getRand(-100, -300)
						}, getRand(50, 200), 'linear')
					}
					$(this).fadeOut(getRand(50, 200), function(){
						$(this).remove();
					})
				})
			} else {
				$('.line' + lines[i]).each(function(){
					$(this).remove();
				})
			}
		}
		
		for (var i=0; i<22; i++) {
			yMat[i] = 0;
		}
		
		for (var i=lines.length-1; i>=0; i--) {

			// set yMat values
			for (var j=lines[i]; j>=0; j--) {
				yMat[j] += 1;
			}
		}
		
		
		for (var i = yMat.length; i > 0; i--) {
			$('.line' + i).each(function(){
			
				if (settings.enableLineClearAnimation) {
					$(this).delay(200).animate({
						top: '+=' + (graphics.blockSize * yMat[i])
					}, getRand(50, 200), 'linear');
				
				} else {
					newY = parseFloat($(this).css('top')) + (graphics.blockSize * yMat[i]);
					$(this).css('top', newY)
				}
				this.className = 'block onBoard line' + (i + yMat[i]);
		
			});
		} 
		//console.profileEnd();
	},
	getBlockPosition : function(jBlock) {
		var x = Math.round(jBlock.position().left / this.blockSize);
		var y = Math.round(jBlock.position().top / this.blockSize) + 2;
		return new Position(x, y);
	},
	hardDrop : function(x, y, lines) {
		x += 1; y -= 2;
		
		var startingPoint = y - lines + 2;
		var jSparkle;
		for (var i=21; i> 0; i--) {
			jSparkle = $('#sparkle' + i);
			if (!jSparkle.queue('fx').length) {
				if (i >= startingPoint && i <= y) {
					jSparkle.css({
						top: i * this.blockSize,
						left: x * this.blockSize
					}).delay(i * 10).fadeIn(10).animate({
						top: '+=' + (this.blockSize * getRand(-1, -2)),
						left: '+=' + (this.blockSize * .5 * getRand(-3, 3))
					}, 100, 'linear').fadeOut(200);
				}
				else {
					jSparkle.hide();
				}
			}
		}
	},
	hideGhostBlocks : function() {
		$('.ghost').each( function() {
			$(this).hide();
		});
	},
	init : function() {
		this.initBoard();
		this.setScale();
		this.createSettingsHandlers();
		
		this.createPermanentBlocks();
		this.createStartingBlocks();
		this.createAnimations();
	},
	
	initBoard: function(){
		$('.gameWindow').css('opacity', .8);
		
		$('#restart').click(function(){
			game.restart();
			w.send('player@restart');
		})
		$('#start').click(function(){
				if(game.gamepossible===true) {
				game.start();
				game.gamestate=true;
				w.send('player@start');
				main.run();
				
				
				}
		})
		$('#rejoin').click(function(){
			
				w.send('player@connect');
				graphics.toggleGameRejoin('hide');
				
		})
		$('.showStats').click(function(){
			game.toggleStats();
		})
		
	/*	$('#loading').fadeOut(200, function(){
		$('#loading').remove();
			$('#board').fadeIn(200);
		});*/
		$('#loading').hide();
		$('#board').show(1000);
	},
	lockPiece : function() {
		var jBlock, lineNumber;
		for (var i = 0; i < 4; i++) {
			jBlock = this.jBlocks.current[i];
			lineNumber = this.getBlockPosition(jBlock).y;
		//	console.log('lineNumber:'+lineNumber);
			jBlock.addClass('onBoard line' + lineNumber)
				.removeAttr('id')
				.removeClass('current');
		}
	},
	createLineBlock  : function(x, y,lineNumber) {
	
		var src = 'img/block-ghost.gif';
		
		
		
		var jBlock = $(document.createElement('img'))
		.attr('src', src)
		.addClass('block')
		.width(this.blockSize)
		.height(this.blockSize)
		
	
		//jBlock.css('opacity', .5);
		
		$('#board').append(jBlock);
		jBlock.css({
			left : x * this.blockSize,
			top : ( y -2 ) * this.blockSize,
			display : (y < 2) ? 'none' : 'block'
		})
		
		jBlock.addClass('onBoard line' + lineNumber)
				.removeAttr('id')
				.removeClass('current');
		
	},
	positionBlock : function(x, y, index, type, next) {
		if (type === 'next') {
			var jBlock = this.jBlocks.next[next][index];
		} else {
			var jBlock = this.jBlocks[type][index];
		}
		
		jBlock.css({
			left : x * this.blockSize,
			top : ( y -2 ) * this.blockSize,
			display : (y < 2) ? 'none' : 'block'
		})
	},
	positionPiece : function(state, type, next) {
		var pieceSize = pieces.getSize(state.piece);
		var count = 0;
		for (var i = 0; i < pieceSize; i++) {
			for (var j = 0; j < pieceSize; j++) {
				if ( pieces.isBlock( state.piece, state.rotation, j, i ) ) {
					var x = (i +  state.position.x);
					var y = (j +  state.position.y);
					this.positionBlock( x, y, count, type, next);
					count++;
				}
			}
		}
	},
	popText : function(text, position0, position1, leveledUp) {
		var divHTML = '<div class="boardAnimation popText';
		divHTML += '" style="';
		if (!leveledUp) {
			divHTML += 'font-size:' + this.blockSize * 1.3 + ';';
		} else {
			divHTML += 'font-size:' + this.blockSize * 1.8 + ';';
		}
		divHTML += 'left:'+position0.x+';top:'+position0.y+';">';
		divHTML += text + '</div>';
		
		$('#board').append($(divHTML)
//			.labeleffect({
//				effect: 'shadow',
//				shadowBlend: true,
//				color: (leveledUp) ? '#F7FFA0' : '#FFFFFF'
//			})
			.css({
				opacity: (leveledUp) ? 1 : .7
			})
			.delay(800)
			.animate({
				left: position1.x,
				top:  position1.y,
				fontSize: 1,
				opacity: .3
			}, 500)
			.fadeOut(200, function() {
				$(this).remove();
			}))
	},
	popScore : function(info) {
		var position0 = new Position();
		var position1 = new Position();
	
		// Move Name/Score
		if (info.moveName !== '') {
			position0.x = 3 * this.blockSize;
			position0.y = (info.position.y-3) * this.blockSize;
			
			position1.x = this.scoreOffsets[0] * this.blockSize;
			position1.y = (this.scoreOffsets[1]) * this.blockSize;
			
			this.popText(info.moveName , position0, position1,true);
			
		}
		
		
		// Line Clear Value
		if (info.lineClearValue > 0) {
			position0.x = (this.levelOffsets[0]) * this.blockSize;
			position0.y = (this.levelOffsets[1] + 2) * this.blockSize;
			
			position1.x = this.levelOffsets[0] * this.blockSize;
			position1.y = (this.levelOffsets[1] + 2) * this.blockSize;
			//this.popText('+ ' + info.lineClearValue + ' lines', position0, position1);
		}
		
		// Level Up
		if (info.leveledUp) {
			position0 = new Position(0, 0);
			position1 = new Position(0, 0);
			
			//this.popText('Level Up!', position0, position1, true);
		}
		
		// Combo Count	
		if (info.comboCount > 1) {
			position0.x = 3 * this.blockSize;
			position0.y = (info.position.y-3) * this.blockSize;
			
			position1.x = this.scoreOffsets[0] * this.blockSize;
			position1.y = (this.scoreOffsets[1]) * this.blockSize;
			
			setTimeout(function(){
				graphics.popText(info.comboCount + '<br /> Combo', position0, position1)
			}, 1000);
		}
		
	},
	reset : function() {
		$('.onBoard, .current').each(function() {
			$(this).remove();
		});
		$('.hold').each(function() {
			$(this).hide();
		});
		this.createStartingBlocks();
		this.toggleGameOver('hide');
		this.toggleGameStart('hide');
	},
	setScale : function() {
		if ($(document).height() < 120) { return false; }
		
	//	this.boardHeight = 12 * Math.round(($(window).height() * settings.boardFillPercent) / 20);
	//	this.boardWidth = this.boardHeight / 2;
		
		this.boardWidth = ($(window).width() / 2.7);
		this.boardHeight=this.boardWidth*2;
		this.blockSize = this.boardHeight / 20;
		this.boardXPos = ( $(window).width() / 2 ) - (this.boardWidth / 2 );
		this.boardYPos =  ($(window).height())-($(window).height())*0.95;
		
		var fontScale = this.boardWidth / 190;
		var bottomYPos = ($(window).height())-($(window).height())*0.2;
		// ----- Board Sizes -----
		
		$('#board').css({
			   top: this.boardYPos,
			  left: this.boardXPos,
			 width: this.boardWidth,
			height: this.boardHeight,
		  fontSize: fontScale + 'em'
		})
			
		$('.gameWindow').css({
			 width: this.boardWidth,
			height: this.boardHeight
		})
		// ------- Various Sizes -------
		
		$('#quickStats').css({
			   top: this.blockSize * this.levelOffsets[1],
			  left: this.blockSize * this.levelOffsets[0]
		})
		$('#rotation').css({
			   top: this.blockSize * (this.levelOffsets[1]+8),
			  left: this.blockSize * this.levelOffsets[0]
		})
	/*	$('#input').css({
			   top: this.boardYPos+this.boardHeight*1.5,
			  left: this.boardXPos,
		})*/
	
	
		
		$('.block').each(function() {
			$(this).css({
				 width: graphics.blockSize,
				height: graphics.blockSize
			})
		})
		
		$('#gameBackground').css({
			   top: this.blockSize * -1.04,
			  left: this.blockSize * -7.56,
			 width: this.blockSize * 25.5,
			height: this.blockSize * 22.22
		})
		
/*		$('#settingsLink').css({
			   top: this.blockSize * 18.5,
			  left: this.blockSize * 13.5,
			 width: this.blockSize * 4,
			height: this.blockSize * 2
		})*/
			
	},
	showGhostBlocks : function() {
		$('.ghost').each( function() {
			$(this).show()
		});
	},
	showHeldBlocks : function() {
		$('.hold').each( function() {
			$(this).show();
		});
	},
	toggleGameOver : function(toggle) {
		if (toggle === 'show') {
			$('#gameOver').fadeIn(500)
		} else {
			$('#gameOver').hide();
		}
	},
	toggleGameStart : function(toggle) {
		if (toggle === 'show') {
			$('#start').fadeIn(500)
		} else {
			$('#start').hide();
		}
	},
	toggleGameReStart : function(toggle) {
		if (toggle === 'show') {
			$('#restart').fadeIn(500)
		} else {
			$('#restart').hide();
		}
	},
	toggleGameRejoin : function(toggle) {
		if (toggle === 'show') {
			$('#rejoin').fadeIn(500)
		} else {
			$('#rejoin').hide();
		}
	},
	toggleGameFight : function(toggle) {
		if (toggle === 'show') {
			$('#fight').fadeIn(500)
		} else {
			$('#fight').hide();
		}
	},
	toggleGameWait : function(toggle) {
		if (toggle === 'show') {
			$('#wait').fadeIn(500)
		} else {
			$('#wait').hide();
		}
	},
	toggleGameWin : function(toggle) {
		if (toggle === 'show') {
			$('#win').fadeIn(500)
		} else {
			$('#win').hide();
		}
	},
	toggleGameLose : function(toggle) {
		if (toggle === 'show') {
			$('#lose').fadeIn(500)
		} else {
			$('#lose').hide();
		}
	},
	togglePause : function( toggle ) {
		if ( toggle === 'show' ) {
			$('#pausepause').fadeIn(200);
		} else {
			$('#pause').fadeOut(200);
		}
	},
	updateHeldPiece : function(hPiece) {
		// destroy current piece
		// update held blocks
		
		for (var i=0; i<4; i++) {
			this.jBlocks.current[i].remove();
		}
				
		var x = this.holdOffset[0];
		var y = this.holdOffset[1];
		if (hPiece === 0) {
			x--;
			y--;
		}
		var pos = new Position( x, y );
		var state = new PieceState( hPiece, 0, pos );
		var color = pieces.getColor( hPiece );
		
		this.positionPiece(state, 'hold', i);
		
		for (var j = 0; j < 4; j++) {
			this.jBlocks.hold[j].attr( 'src', 'img/block-' + color + '.gif' );
		}
	},
	toggleSettings : function(toggle) {
		if (toggle === 'show') {
			$('#settings').show();
		} else {
			$('#settings').hide();
		}
	},
	toggleStats : function(toggle) {
		if (toggle === 'show') {
			$('#statsContainer').html(stats.toHTML())
			$('#fullStats').show();
		} else {
			$('#fullStats').hide();
		}
	},
	updateGameTime : function(gameTime) {
		var seconds, minutes = 0;
		
		seconds = Math.floor(gameTime/1000)%60;
		minutes = Math.floor(gameTime/(1000*60))%60
		
		document.getElementById('gameTime').innerHTML = padDigits(minutes, 2) + ':' + padDigits(seconds, 2);
	},
	updateLevelData : function(lines, toNext, currentLevel) {
		$('#currentLevel').html(padDigits(currentLevel, 2));
		$('#toNextLevel').html(padDigits(toNext, 2));
		$('#totalLines').html(padDigits(lines, 4));
	},
	updateNextPieces : function(nextArray) {
		for (i = 0; i < nextArray.length; i++) {
			var x = this.nextOffsets[i][0];
			var y = this.nextOffsets[i][1];
			if (nextArray[i] === 0) {
				x--;
				y--;
			}
			var pos = new Position( x, y );
			var state = new PieceState( nextArray[i], 0, pos );
			var color = pieces.getColor( nextArray[i] );
			
			this.positionPiece(state, 'next', i);

			for (var j = 0; j < 4; j++) {
				this.jBlocks.next[i][j].attr( 'src', 'img/block-' + color + '.gif' );
			}
		}
	},
	updateScore : function (score) {
		$('#totalScore').html(padDigits(score, 10))
	},
	wallKick : function(state) {
		var x, y;
		if (state.position.x < 1) {
			x = -1;
		} else {
			x = 9;
		}
		y = state.position.y-2;
		$('#board').append($(document.createElement('img'))
			.addClass('boardAnimation')
			.attr('src', 'img/pow.gif')
			.css('left', x * this.blockSize )
			.css('top',  y * this.blockSize)
			.width(this.blockSize*1.5)
			.height(this.blockSize*1.5)
			.fadeIn(20)
			.fadeOut(500, function() {
				$(this).remove();
			})
		);
	}
};


// --------------------------------------------------------------------------------  
                                  // attack
// --------------------------------------------------------------------------------

var attack = {
	blank : 0,
	attackmsg: [],
	attackblank: [],
	createLine : function(y) {
		var createdLines = [];
		//this.blank = Math.floor(Math.random() * 10);
		console.log('blank:'+this.blank);
		for ( var j = 0; j <22-y; j++) {
			for (var i = 0; i < 10; i++) {
				board.board[j][i] = board.board[j+y][i];
							
			}
		}
		for ( var j = 0; j <y; j++) {
			for (var i = 0; i < 10; i++) {
				if(i!==this.blank) {
					console.log('blank:'+this.blank);
					board.board[21-j][i]=8;
					
				}
				else {
					board.board[21-j][i]=0;
				}
					
				
			}
			createdLines.unshift(21-j);
		}
		return createdLines;
		
	},
	
	createLines : function (lines) {
		
		for (var i = lines.length; i <22; i++) {
			$('.line' + i).each(function(){
				console.log(i);
				newY = parseFloat($(this).css('top')) - (graphics.blockSize * lines.length);
				$(this).css('top', newY)
				
				this.className = 'block onBoard line' + (i-lines.length);
				console.log(this.className);
			});
		}
		
		for(var j=0;j<lines.length;j++) {
			for(var i=0;i<10;i++) {
				if(i!==this.blank) {
				graphics.createLineBlock(i,21-j,21-j);
				}
			
			}
		}
		
		
	},
	
	lineUp : function(line) {
		var createdLines=this.createLine(line);
		console.log(createdLines);
		this.createLines(createdLines);
		
	}	,	
	createLineUp : function(attackstr,b) {
		this.blank=Number(b);
		switch(attackstr) {
			case 'triple' : this.lineUp(2); break;
			case 'tetris' : this.lineUp(3); break;
		//	case 'btbtetris' : this.lineUp(4); break;
			case 'tspins' : this.lineUp(2); break;
			case 'tspind' : this.lineUp(3); break;
			case 'tspint' : this.lineUp(4); break;
			case 'combo3' : this.lineUp(2); break;
			case 'combo4' : this.lineUp(2); break;
			case 'combo5' : this.lineUp(2); break;
			case 'combo6' : this.lineUp(2); break;
			case 'combo7' : this.lineUp(3); break;
			case 'combo8' : this.lineUp(3); break;
			case 'combo9' : this.lineUp(3); break;
			case 'combo10' : this.lineUp(3); break;
			case 'combo11' : this.lineUp(3); break;
			case 'combo12' : this.lineUp(3); break;
			case 'combo13' : this.lineUp(3); break;
			case 'combo14' : this.lineUp(3); break;
			case 'combo15' : this.lineUp(3); break;
		
		}
		
	}		
	
}
// --------------------------------------------------------------------------------  
                                  // input
// --------------------------------------------------------------------------------

var input = {

	
	checkKey : function(e) { 
	
		switch (e.keyCode) {
			case 37: // LEFT ARROW
				if ( game.mode === 'drop' || game.mode === 'lockDelay' ) {
					game.slidePiece('left');
					
					w.send(playerNumber+'@input@left');
				
				
				}
			break;
			case 39: // RIGHT ARROW
				if ( game.mode === 'drop' || game.mode === 'lockDelay' ) {
					game.slidePiece('right');
					w.send(playerNumber+'@input@right');
					
				}
			break;
			/*case 17: case 90: // CONTROL or Z
				if ( game.mode === 'drop' || game.mode === 'lockDelay' ) {
					game.rotatePiece(checked_value);
				}
			break;*/
			case 38: // UP ARROW or X
				if ( game.mode === 'drop' || game.mode === 'lockDelay' ) {
					w.send(playerNumber+'@input@up'+check_rotation());
					game.rotatePiece(check_rotation());
				
					
				}
			break;
			case 32: // SPACE BAR
			
				if ( game.mode === 'drop' ) {
					game.hardDrop();
					
					
				}
				inputspace=true;
				//w.send('player@input@space');
			break;
			case 40: // DOWN ARROW
				if ( game.mode === 'drop' || game.mode === 'lockDelay' ) {
					game.softDrop();
					w.send(playerNumber+'@input@down');
				
				}
			break;
			case 16: // SHIFT
				if (game.mode === 'drop' || game.mode === 'lockDelay') {
					game.swapHoldPiece();
					w.send(playerNumber+'@input@shift');
					
				}
			break;
			case 27: // ESCAPE
				if (game.mode !== 'gameOver' && game.mode !== 'settings') {
					var createdLines=attack.createLine(2);
		attack.createLines(createdLines);

				}
			break;
		}
	},
	init : function() {
		$(document).keydown( input.checkKey );
	}
};

// --------------------------------------------------------------------------------  
                                  // levels
// --------------------------------------------------------------------------------

var levels = {
	currentLevel  : 1,
	dropWaitTime  : 0, // ms to wait before dropping piece
	lockWaitTime  : 500,
	lines         : 0,
	linesPerLevel : 25,
	maxLevel      : 15,
	spawnWaitTime : 200,
	toNext        : 25,
		adjustLines : function(lines) {
		var leveledUp = false;
		this.toNext -= lines;
		this.lines += lines;
		while (this.toNext <= 0) {
			this.toNext += this.linesPerLevel;
			this.setLevel(this.currentLevel + 1);
			leveledUp = true;
		}
		return leveledUp;
	},
	reset : function() {
		this.lines = 0;
		this.toNext = this.linesPerLevel;
	},
	setLevel : function(level) {
		if (level > this.maxLevel) {
			return false;
		}
		this.dropWaitTime = Math.pow( ( 0.8 - ( 1.2 * 0.007 ) ), 1.2) * 1000;
		this.currentLevel = level;
	}

};

// --------------------------------------------------------------------------------  
                                  // main
// --------------------------------------------------------------------------------

var main = {
	starttime	  : 0,
	timegab 	  : 0,
	counter       : 0,
	framesElapsed : 0,
	gameTime      : 0,
	INT           : 1000 / 20,
	time1         : 0, // current time
	time2         : new Date().getTime(), // previous time
	gameTimeCount : 40,
	init : function() {
		game.init();
		this.starttime = new Date().getTime();
		//this.run();
	},
	resetCounter : function() {
		this.counter = 0;
	},
	resetGameTime : function() {
		this.gameTime = 0;
	},
	// Main Game Loop
	run : function() {
		if(this.timegab===0) {
			this.timegab=new Date().getTime()-this.starttime ;
			}
		this.time1 = new Date().getTime()-this.timegab ;
	
		
	//	var seconds = Math.floor(this.gameTime/1000);
	
	//	var speed= (Math.floor(seconds/30)+1);
	//	if(speed>10) { speed=10; }
	//	levels.dropWaitTime = Math.pow( ( 0.8 - ( speed * 0.007 ) ), speed) * 1000;
		if (game.mode === 'drop') {
			this.framesElapsed = Math.floor(this.counter / levels.dropWaitTime)
			
			if ( this.framesElapsed >= 1 ) {
				for (var i = 0; i < this.framesElapsed; i++) {
					game.dropPiece();
				}
				this.resetCounter();
			}
		} else if ( game.mode === 'lockDelay' ) {
			if( board.checkOpen(game.currentState, 1) ) {
				game.mode = 'drop';
				this.resetCounter();
			} else {
				if ( this.counter >= levels.lockWaitTime ) {
						game.lockPiece();
						this.resetCounter();
					}
				}
		} else if ( game.mode === 'spawnDelay' ) {
			if ( this.counter >= levels.spawnWaitTime ) {
				game.spawnPiece();
				this.resetCounter();
			}
		}
		
		if ( game.mode !== 'paused' && game.mode !== 'gameOver' && game.mode !== 'settings' && game.mode !== 'stats') { 
			this.counter  += this.time1 - this.time2;
			this.gameTime += this.time1 - this.time2;
			
			if (!--this.gameTimeCount) {
				this.gameTimeCount = 30;
				graphics.updateGameTime(this.gameTime)
				
//				if (this.gameTime > 360000) {
//					return false;
//				}
			}
		}
		
		this.time2 = this.time1;
		setTimeout(function() { main.run(); }, this.INT); // repeat main game loop
	}
};

// --------------------------------------------------------------------------------  
                                  // pieces  
// --------------------------------------------------------------------------------

// Piece Matrices

var pieces = {
	//         I    J      L     O      S    Z   T
	colors : 'cyan blue orange yellow green red purple'.split(' '),
	pieces : [
		[ // ------ I ------
		[[0,0,0,0,0],
		 [0,0,0,0,0],
		 [0,1,1,1,1], // Rotation 0
		 [0,0,0,0,0],
		 [0,0,0,0,0]],
		 
		[[0,0,0,0,0],
		 [0,0,1,0,0],
		 [0,0,1,0,0], // Rotation 1
		 [0,0,1,0,0],
		 [0,0,1,0,0]],
		 
		[[0,0,0,0,0],
		 [0,0,0,0,0],
		 [1,1,1,1,0], // Rotation 2
		 [0,0,0,0,0],
		 [0,0,0,0,0]],
		 
		[[0,0,1,0,0],
		 [0,0,1,0,0],
		 [0,0,1,0,0], // Rotation 3
		 [0,0,1,0,0],
		 [0,0,0,0,0]]
		], // ------ End I ------
		[ // ------ J ------
		[[1,0,0],
		 [1,1,1], // Rotation 0
		 [0,0,0]],
		 
		[[0,1,1],
		 [0,1,0], // Rotation 1
		 [0,1,0]],
		 
		[[0,0,0],
		 [1,1,1], // Rotation 2
		 [0,0,1]],
		 
		[[0,1,0],
		 [0,1,0], // Rotation 3
		 [1,1,0]],
		 ], // ------ End J ------
		 [ // ------ L ------
		[[0,0,1],
		 [1,1,1], // Rotation 0
		 [0,0,0]],
		 
		[[0,1,0],
		 [0,1,0], // Rotation 1
		 [0,1,1]],
		 
		[[0,0,0],
		 [1,1,1], // Rotation 2
		 [1,0,0]],
		 
		[[1,1,0],
		 [0,1,0], // Rotation 3
		 [0,1,0]],
		 ], // ------ End L ------
		 [ // ------ O ------
		[[0,1,1],
		 [0,1,1], // Rotation 0
		 [0,0,0]],
		 
		[[0,0,0],
		 [0,1,1], // Rotation 1
		 [0,1,1]],
		 
		[[0,0,0],
		 [1,1,0], // Rotation 2
		 [1,1,0]],
		 
		[[1,1,0],
		 [1,1,0], // Rotation 3
		 [0,0,0]],
		 ], // ------ End O ------
		 [ // ------ S ------
		[[0,1,1],
		 [1,1,0], // Rotation 0
		 [0,0,0]],
		 
		[[0,1,0],
		 [0,1,1], // Rotation 1
		 [0,0,1]],
		 
		[[0,0,0],
		 [0,1,1], // Rotation 2
		 [1,1,0]],
		 
		[[1,0,0],
		 [1,1,0], // Rotation 3
		 [0,1,0]],
		 ],// ------ End S ------
		 [ // ------ Z ------
		[[1,1,0],
		 [0,1,1], // Rotation 0
		 [0,0,0]],
		 
		[[0,0,1],
		 [0,1,1], // Rotation 1
		 [0,1,0]],
		 
		[[0,0,0],
		 [1,1,0], // Rotation 2
		 [0,1,1]],
		 
		[[0,1,0],
		 [1,1,0], // Rotation 3
		 [1,0,0]],
		 ],// ------ End Z ------
		 [ // ------ T ------
		[[0,1,0],
		 [1,1,1], // Rotation 0
		 [0,0,0]],
		 
		[[0,1,0],
		 [0,1,1], // Rotation 1
		 [0,1,0]],
		 
		[[0,0,0],
		 [1,1,1], // Rotation 2
		 [0,1,0]],
		 
		[[0,1,0],
		 [1,1,0], // Rotation 3
		 [0,1,0]],
		 ]// ------ End T ------
	],
	getColor : function(piece) {
		return this.colors[piece];
	},
	getInitialPosition : function(piece) {
		if (piece === 0) {
			return new Position(2, 0);
		} else {
			return new Position(3, 1);
		}
	},
	getSize : function(piece) {
		if (piece === 0) {
			return 5;
		} else {
			return 3;
		}
	},
	isBlock : function(piece, rotation, x, y) {
		return this.pieces[piece][rotation][x][y];
	}
};




// --------------------------------------------------------------------------------  
                                  // score
// --------------------------------------------------------------------------------

var score = {
	backToBackBonus    : 1.5,
	comboCount         : 0,
	comboIncrement     : 100,
	dropType           : 0,
	lines              : 0,
	prevLines          : 0,
	prevType           : '',
	total              : 0,
	TSH                : 'b6589fc6ab0dc82cf12099d1c2d40ab994e8410c',
	type               : '',
	
	addHardDropBonus : function(linesDropped) {
        if (sha1Hash(this.total) !== this.TSH) {
            alert('Error updating score!');
            location.reload();
        }
        
        this.total += 2 * linesDropped;
        
        this.TSH = sha1Hash(this.total);
		
		this.updateScore();	
	},
	addSoftDropBonus : function() {
        if (sha1Hash(this.total) !== this.TSH) {
            alert('Error updating score!');
            location.reload();
        }
        
        this.total++;
        
        this.TSH = sha1Hash(this.total);
        
        this.updateScore(); 
		this.updateScore();
	},
	getComboBonus : function() {
		var bonus = 0;
		var blank=Math.floor(Math.random() * 10);
		if (this.lines === 0) {
			this.comboCount = 0;
			return 0;
		} else {
			bonus = this.comboCount * this.comboIncrement * levels.currentLevel;
			this.comboCount++;
			if(this.comboCount>=3) {
			attack.blank=Math.floor(Math.random() * 10);
			w.send(playerNumber+'@attack@combo'+this.comboCount+'@'+blank);
			}
			return bonus;
		}
	},
	getLineClearValue : function() {		
		var lineClearValue = 0;
		
		if (this.type === 'lineclear') {
			switch(this.lines) {
				case 1 : lineClearValue = 1; break;
				case 2 : lineClearValue = 3; break;
				case 3 : lineClearValue = 5; break;
				case 4 : lineClearValue = 8; break;
			}
		} else if (this.type === 'twist') {
			switch (this.lines) {
				case 0 : lineClearValue = 1; break;
				case 1 : lineClearValue = 2; break;
				case 2 : lineClearValue = 4; break;
			}
		} else if (this.type === 'tspin') {
			switch (this.lines) {
				case 0 : lineClearValue = 8;  break;
				case 1 : lineClearValue = 12; break;
				case 2 : lineClearValue = 16; break;
				case 3 : lineClearValue = 20; break;
			}
		}
		if (this.isBackToBack()) {
			lineClearValue = Math.floor(lineClearValue * this.backToBackBonus)
		}
		
		stats.values.ClearedLines += this.lines;
		stats.values.ClearedLineValue += lineClearValue;
		
		return lineClearValue;
	},
	getMoveName : function() {
		// line clear, tspin, twist, single/double/triple/tetris/combo, back2back
		var moveName = '';
		if (this.isBackToBack()) {
			moveName = 'Back2Back ';
		}
		if (this.type === 'lineclear') {
			switch (this.lines) {
				case 1: moveName += ''; break;
				case 2: moveName += 'Double'; break;
				case 3: moveName += 'Triple'; break;
				case 4: moveName += 'Tetris'; break;
			}
		} else if (this.type === 'twist') {
			switch (this.lines) {
				case 0: moveName += 'Twist'; break;
				case 1: moveName += 'Twist Single'; break;
				case 2: moveName += 'Twist Double'; break;
				case 3: moveName += 'Twist Triple'; break;
			}
		} else if (this.type === 'tspin') {
			switch(this.lines) {
				case 0: moveName += 'T-Spin'; break;
				case 1: moveName += 'T-Spin Single'; break;
				case 2: moveName += 'T-Spin Double'; break;
				case 3: moveName += 'T-Spin Triple'; break;
			}
		}
		return moveName;
	},
	increase : function() {
		var addAmount = 0;
		var blank=Math.floor(Math.random() * 10);
		if (this.type === 'lineclear') {
			switch (this.lines) {
				case 0: addAmount += 0;  break;
				case 1: addAmount += 100; stats.values.Singles++; break;
				case 2: addAmount += 300; stats.values.Doubles++; break;
				case 3: addAmount += 500; stats.values.Triples++; 
						w.send(playerNumber+'@attack@triple@'+blank);
						break;
				case 4: addAmount += 800; stats.values.Tetrises++;
						w.send(playerNumber+'@attack@tetris@'+blank);
						break;
			}
		} else if (this.type === 'twist') {
			switch (this.lines) {
				case 0: addAmount += 100; stats.values.TwistNoLines++; break;
				case 1: addAmount += 200; stats.values.TwistSingles++; break;
				case 2: addAmount += 600; stats.values.TwistDoubles++; break;
				case 3: addAmount += 1000; break;
			}
		} else if (this.type === 'tspin') {
			switch(this.lines) {
				case 0: addAmount += 300; stats.values.TSpinNoLines++; break;
				case 1: addAmount += 600; stats.values.TSpinSingles++; 
						w.send(playerNumber+'@attack@tspins@'+blank);break;
				case 2: addAmount += 900; stats.values.TSpinDoubles++;
						w.send(playerNumber+'@attack@tspind@'+blank);break;
				case 3: addAmount += 900; stats.values.TSpinTriples++; 
						w.send(playerNumber+'@attack@tspint@'+blank); break;
			}
		}
				
		addAmount += this.getComboBonus();
		
		if ( this.isBackToBack() ) {
		//	w.send(playerNumber+'@attack@btbtetris@'+blank);
			addAmount *= this.backToBackBonus;
		}
		
		if (sha1Hash(this.total) !== this.TSH) {
			alert('Error updating score!');
			location.reload();
		}
		
		this.total += addAmount;
		
		this.TSH = sha1Hash(this.total);
		
		this.updateScore();
		
		return addAmount;
		
	},
	isBackToBack : function() {
		if (this.prevType === this.type && this.prevLines === this.lines) {
			if (this.type === 'lineclear' && this.lines === 4) {
				return true;
			} else if (this.type === 'tspin' && this.lines > 0) {
				return true;
			}
		}
		return false;
	},
	reset : function() {
		this.TSH = 'b6589fc6ab0dc82cf12099d1c2d40ab994e8410c';
		this.resetTemp();
		this.comboCount = 0;
		this.prevLines = 0;
		this.prevType = 0;
		this.total = 0;
	},
	resetTemp : function() {
		this.lines = 0;
		this.dropType = 0;
		this.linesDropped = 0;
		this.type = '';
	},
	setPrevious : function() {
		this.prevType = this.type;
		this.prevLines = this.lines;
	},
	updateScore : function() {
		graphics.updateScore( this.total );
		stats.values.TotalScore = this.total;
	}
};

// --------------------------------------------------------------------------------  
                                  // settings
// --------------------------------------------------------------------------------

var settings = {
	enableHardDropAnimation : true,
	enableLevelUpAnimation : true,
	enableLineClearAnimation : true,
	enableScorePopAnimation : true,
	enableTetrisAnimation : true,
	enableWallKickAnimation : true,
	boardFillPercent : .85,
	startLevel : 1
}

// --------------------------------------------------------------------------------  
                                  // stats
// --------------------------------------------------------------------------------

var stats = {
	values: {
		// Simple Count
		HardDrops:        0,
		SoftDrops:        0,
		Rotations:        0,
		Tetriminos:       0,
		Singles:          0,
		Doubles:          0,
		Triples:          0,
		Tetrises:         0,
		TwistNoLines:     0,
		TwistSingles:     0,
		TwistDoubles:     0,
		TSpinNoLines:     0,
		TSpinSingles:     0,
		TSpinDoubles:     0,
		TSpinTriples:     0,
		// Time Varied
		TetriminoPerMin:  0,
		LinesPerMin:      0,
		// From Score/Levels
		ClearedLines:     0,
		ClearedLineValue: 0,
		TotalScore:       0,
		TotalTime:        0
	},
	getNumPerMin : function(value, gameTime) {
		return Math.Round((this.values.Tetrises / (gameTime/(1000/60)))*10)/10 ;
	},
	toHTML : function() {
		var HTMLString = '<table id="statsAll">';
		$.each(this.values, function(key, value) {
			HTMLString += '<tr><td>' + key + '</td><td>' + value + '</td></tr>'
		})
		HTMLString += '</table>';
		return HTMLString;
	},
	updateTimedValues : function(gameTime) {
		this.totalTime = gameTime;
		this.values.TetriminoPerMin = this.getNumPerMin(this.values.Tetriminos, gameTime);
		this.values.LinesPerMin = this.getNumPerMin(this.values.ClearedLines, gameTime);
	}
}

var replay = {
	// array, where 
	// index = time stamp of event
	// value = actionCode
};

var actionCode = {
	moveLeft: 0,
	moveRight: 1,
	softDrop: 2,
	hardDrop: 3,
	rotateClockwise: 4,
	rotateCounterClockwise: 5,
	gravityDrop: 6
}

// --------------------------------------------------------------------------------  
                                  // sound
// --------------------------------------------------------------------------------
function check_rotation() {
	var obj = document.getElementsByName('currentRotation');
	var checked_value = '';
	  for( i=0; i<obj.length; i++) {
                if(obj[i].checked) {
                        checked_value = obj[i].value;
                }
        }
		return checked_value;
}
function input_up() {
	if ( game.gamestate===true && game.mode === 'drop' || game.mode === 'lockDelay' ) {
					w.send(playerNumber+'@input@up'+check_rotation());
					game.rotatePiece(check_rotation());
					
				}

}
function input_left() {
	if ( game.gamestate===true && game.mode === 'drop' || game.mode === 'lockDelay' ) {
					w.send(playerNumber+'@input@left');
					game.slidePiece('left');
					
				}
}

function input_right() {
	if (game.gamestate===true && game.mode === 'drop' || game.mode === 'lockDelay' ) {
						w.send(playerNumber+'@input@right');
					game.slidePiece('right');
					
				}
}
function input_down() {
	if (game.gamestate===true && game.mode === 'drop' || game.mode === 'lockDelay' ) {
						w.send(playerNumber+'@input@down');
					game.softDrop();
					
				}
}
function input_hold() {
	if (game.gamestate===true && game.mode === 'drop' || game.mode === 'lockDelay') {
					game.swapHoldPiece();
						w.send(playerNumber+'@input@shift');
				}
}
function input_space() {
	if (game.gamestate===true && game.mode === 'drop' ) {
					game.hardDrop();
					
				}
		
				inputspace=true;
}
function ServerConnect() {
	url = "ws://localhost:8080";
    w = new WebSocket(url);
 
    w.onopen = function() {
        w.send('player@connect');
    }
	 w.onmessage = function(e) {
	 console.log(e.data);
	 var strArray=e.data.split('@');
		if(e.data==='player1') {
			
			playerNumber=e.data;
			graphics.toggleGameWin('hide');
			graphics.toggleGameLose('hide');
			if(started===0) {
			graphics.toggleGameStart('show');
			}
			else {
			fightstate=false;
			graphics.toggleGameOver('show');
			}
		}
		else if(e.data === 'ready') {
			game.gamepossible=true;
		}
		else if(e.data==='player2') {
			playerNumber=e.data;
			graphics.toggleGameFight('show');
			 
				graphics.toggleGameWait('hide');
			
		}
		else if(e.data==='fight') {
			game.heldPiece = -1;
		
		
			score.reset();
			levels.reset();
		board.reset();
		graphics.reset();
		main.resetCounter();
		main.resetGameTime();
				
		game.mode = 'drop';
			graphics.toggleGameStart('hide');
			graphics.toggleGameWait('hide');
			graphics.toggleGameFight('show');
			
		}
		
		else if(e.data === 'start') {
				graphics.toggleGameFight('hide');
				graphics.toggleGameWait('hide');
				graphics.toggleGameWin('hide');
				graphics.toggleGameLose('hide');
				if(started===0) {
					game.start();
					main.run();
				}
				else {
					game.restart();
				}
				started++;
				game.gamestate=true;
				w.send('player@start2');
				
				fightstate=true;
		
		}
		
		else if(e.data === 'gameover' ) {
			game.pause();
	
		}
		else if(strArray[0]==='wait') {
			graphics.toggleGameWait('show');
			$('#waitNumber').html(padDigits(Number(strArray[1]), 2)); 
		}
		else if(strArray[0]==='attack') {
			//attack.createLineUp(strArray[1],strArray[2]);
			attack.attackmsg.push(strArray[1]);
			attack.attackblank.push(strArray[2]);
		}
	
        
    }

 
}


function wait(msecs)
{
var start = new Date().getTime();
var cur = start;
while(cur - start < msecs)
{
cur = new Date().getTime();
}
}


var inputspace=false;
var playerNumber;
var fightstate=false;
var started=0;
$(window).load( function(){
	var serverconnect=new ServerConnect();
	main.init();
	
	main.resetCounter();
	
});
