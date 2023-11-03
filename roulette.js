const { Telegraf } = require('telegraf');
const axios = require('axios');
const bot = new Telegraf('6557375056:AAHCQ2DKxA0WXf2M2uOveJk6lo-6zNWOQ30');
//6557375056:AAHCQ2DKxA0WXf2M2uOveJk6lo-6zNWOQ30
//6402598831:AAHkCJKGwcottBK2UBegYRt1sJbjR7p9YbE
const fs = require('fs');
// Replace with the actual user ID of the admin or creator
const adminUserId = 5085318297;
//

let isGameRunning = false;
let gameStarter = null; // Track who started the game
let players = [];
let Demoplayers = [];
let pastWinningNumbers = [];
let betClosedTimeout = null;
let isBettingClosed = false;
let betClosedTimeoutSet = false;
const playerScores = {};
const playerScoresDemo = {};
const playerWinnings = {};

bot.command('begin',async (ctx) => {
  if (!isGameRunning) {
    isGameRunning = true;
    gameStarter = ctx.message.from.id; // Record who started the game
    players = [];
    Demoplayers = [];
    isBettingClosed = false;

    // Get the information from the last 10 rounds
    const last10PastWinningNumbers = pastWinningNumbers.slice(-12);
    const last10RoundsInfo = last10PastWinningNumbers
  .map((number, index) => `${number}${getPocketEmoji(number)}${(index + 1) % 4 === 0 ? '\n' : ', '}`)
  .join('');


  const scoreboardDemo = await getScoreboardDemo();
// Check if there is data to display
if (scoreboardDemo.length === 0) {
  ctx.reply('No scoreboard data available.');
}

// Take the first 10u 0 elements from scoreboardData
const topDemoPlayers = scoreboardDemo.slice(0, 30);

// Format the data for display
const nonZeroTopDemoPlayers = topDemoPlayers.filter(({ scoredemo }) => scoredemo !== 0);

const scoreboardDemoMessage = nonZeroTopDemoPlayers.slice(0, 10)
  .map(({ username, scoredemo }, index) => `${index + 1}. @${sanitizeUsername(username)}: ${scoredemo}`)
  .join('\n');


  const scoreboardData = await getScoreboard();
  // Check if there is data to display
  if (scoreboardData.length === 0) {
    ctx.reply('No scoreboard data available.');
  }
  
  // Take the first 10u 0 elements from scoreboardData
  const topPlayers = scoreboardData.slice(0, 30);
  
  // Format the data for display
  const nonZeroTopPlayers = topPlayers.filter(({ score }) => score !== 0);
  
  const scoreboardMessage = nonZeroTopPlayers.slice(0, 10)
    .map(({ username, score }, index) => `${index + 1}. @${sanitizeUsername(username)}: ${score}`)
    .join('\n');
// Rest of your code remains unchanged
const imagePath = 'Cards/startroulette.gif';  // Change this to the actual path of your image
const imageStream = fs.createReadStream(imagePath);


console.log('Caption:', `
  🎊*A new round has started!*🎊 \n\n ⏪ *Last* *Rounds:* \n${last10RoundsInfo}\n\n*Scoreboard:*📈\n${scoreboardMessage}\n\n*Scoreboard:*📈\n${scoreboardDemoMessage}\n\n*Place your bets using*\n /bet <type> <amount>.
`);

    // Send the image followed by the announcement of a new round and information from the last 10 rounds
    ctx.replyWithAnimation({ source: imageStream }, {
      caption: `
      🎊*A new round has started!*🎊 \n\n ⏪ *Last* *Rounds:* \n${last10RoundsInfo}\n\n 🎊*Get Ready For Upcoming $10,000💰 weekly Gaming🎲 Competition*🎊 \n\n*Scoreboard:*📈\n${scoreboardMessage}\n\n*Scoreboard Demo:*📈\n${scoreboardDemoMessage}\n\n*Place your bets using*\n /bet <type> <amount>.`,
      parse_mode: 'Markdown', // Specify parse_mode explicitly
    });

      betClosedTimeoutSet = true;
      betClosedTimeout = setTimeout(() => {
        if (isGameRunning) {
          closeBets(ctx);
        }
      }, 20000);
    

    // Automatically close the bets after 10 seconds of the first bet
  } else {
    ctx.reply('A game is already in progress.');
  }
});

// Define a command or function to end the game
bot.command('endgame', async (ctx) => {
  if (isGameRunning) {
    // Clear the timeout if it's set
    if (betClosedTimeoutSet) {
      clearTimeout(betClosedTimeout);
      betClosedTimeoutSet = false;
    }

    // Add any additional cleanup or logic for ending the game
    isGameRunning = false;
    gameStarter = null;
    players = [];
    Demoplayers = [];
    isBettingClosed = false;

    // Any other cleanup or logic can go here

    // Reply to the user that the game has ended
    ctx.reply('The game has ended.');

    // Optionally, you can send a message to all players or perform other actions

  } else {
    ctx.reply('No game is currently running.');
  }
});


bot.command('bet', async (ctx) => {
  if (isBettingClosed) {
    ctx.reply('Betting is currently closed.');
    return;
  }

  const userId = ctx.from.id;
  console.log(userId);

  try {
    const balanceResponse = await axios.get(`http://localhost:3001/api/mazbo/user/${userId}`);
    const userBalance = balanceResponse.data.realGameBalance;
    const userInviter = balanceResponse.data.inviterId;
    console.log(userBalance);

    if (isGameRunning) {
      const [betTypeOrNumber, amount] = ctx.message.text.split(' ').slice(1);

      if (!isNaN(betTypeOrNumber)) {
        // It's a number bet
        handleNumberBet(ctx, userId, userBalance, userInviter, betTypeOrNumber, amount);
      } else {
        // It's a bet type
        handleBetType(ctx, userId, userBalance, userInviter, betTypeOrNumber, amount);
      }
    } else {
      ctx.reply('No game is currently running.');
    }
  } catch (error) {
    console.error(error);
    ctx.reply(`Please @${ctx.message.from.username}  Dm @fp_blackjackbot and fund your account.`);
  }
});

async function handleNumberBet(ctx, userId, userBalance, userInviter, betTypeOrNumber, amount) {
  if (isValidNumberBet(betTypeOrNumber) && isValidAmount(amount)) {
    const betAmount = parseInt(amount);
    console.log('Response sent:', betAmount);
    const percentageToAdd = 0.01;
    const amountToAdd = Math.ceil(betAmount * percentageToAdd);
    console.log(userInviter);

    if (userBalance >= betAmount) {
      let balanceUpdateSuccess = false;
      let updateSuccess = false;

      // Deduct user's bet amount
      balanceUpdateSuccess = await deductBalance(userId, betAmount);

      // If inviterId is defined, update the inviter's balance
      if (userInviter) {
        updateSuccess = await updateBalance(userInviter, amountToAdd);
      }
      const guessedNumber = parseInt(betTypeOrNumber);
      const player = { userId, username: ctx.message.from.username || ctx.message.from.first_name, betType: guessedNumber, amount: betAmount };
      players.push(player);
      ctx.reply(`Bet placed: @${ctx.message.from.username} bet on the number ${guessedNumber}${getPocketEmoji(guessedNumber)} with 🪙${amount}.`);
    } else {
      ctx.reply(`Please @${ctx.message.from.username} Dm @fp_blackjackbot and fund your account.`);
    }
  } else {
    ctx.reply('*Invalid number bet format.* \n Use /bet <number> <amount>.\n Min 10, Max 1000', { parse_mode: 'Markdown' });
  }
}



async function handleBetType(ctx, userId, userBalance, userInviter, betTypeOrNumber, amount) {
  if (isValidBetType(betTypeOrNumber) && isValidAmount(amount)) {
    const betAmount = parseInt(amount);
    console.log('Response sent:', betAmount);
    const percentageToAdd = 0.01;
    const amountToAdd = Math.ceil(betAmount * percentageToAdd);
    console.log(userInviter);

    if (userBalance >= betAmount) {
      let balanceUpdateSuccess = false;
      let updateSuccess = false;

      // Deduct user's bet amount
      balanceUpdateSuccess = await deductBalance(userId, betAmount);

      // If inviterId is defined, update the inviter's balance
      if (userInviter) {
        updateSuccess = await updateBalance(userInviter, amountToAdd);
      }

      const player = { userId, username: ctx.message.from.username || ctx.message.from.first_name, betType: betTypeOrNumber.toLowerCase(), amount: betAmount };
      players.push(player);
      ctx.reply(`Bet placed: @${ctx.message.from.username} bet on ${betTypeOrNumber} with 🪙${amount}.`);
    } else {
      ctx.reply(`Please @${ctx.message.from.username} Dm @fp_blackjackbot and fund your account.`);
    }
  } else {
    ctx.reply('*Invalid bet format.* \n Use /bet <type> <amount>.\n Min 10, Max 1000', { parse_mode: 'Markdown' });
  }
}


bot.command('betd', async (ctx) => {
  if (isBettingClosed) {
    ctx.reply('Betting is currently closed.');
    return;
  }

  const userId = ctx.from.id;
  console.log(userId);

  try {
    const balanceResponse = await axios.get(`http://localhost:3001/api/mazbo/user/${userId}`);
    const userBalance = balanceResponse.data.balance;
    const userInviter = balanceResponse.data.inviterId;
    console.log(userBalance);

    if (isGameRunning) {
      const [betTypeOrNumber, amount] = ctx.message.text.split(' ').slice(1);

      if (!isNaN(betTypeOrNumber)) {
        // It's a number bet
        handleNumberBetDemo(ctx, userId, userBalance, userInviter, betTypeOrNumber, amount);
      } else {
        // It's a bet type
        handleBetTypeDemo(ctx, userId, userBalance, userInviter, betTypeOrNumber, amount);
      }
    } else {
      ctx.reply('No game is currently running.');
    }
  } catch (error) {
    console.error(error);
    ctx.reply(`Please @${ctx.message.from.username}  Dm @fp_blackjackbot and fund your account.`);
  }
});
//http://localhost:3001
async function handleNumberBetDemo(ctx, userId, userBalance, userInviter, betTypeOrNumber, amount) {
  if (isValidNumberBet(betTypeOrNumber) && isValidAmount(amount)) {
    const betAmount = parseInt(amount);
    console.log('Response sent:', betAmount);
    const percentageToAdd = 0.01;
    const amountToAdd = Math.ceil(betAmount * percentageToAdd);
    console.log(userInviter);

    if (userBalance >= betAmount) {
      let balanceUpdateSuccess = false;
      let updateSuccess = false;

      // Deduct user's bet amount
      balanceUpdateSuccess = await deductBalanceDemo(userId, betAmount);

      // If inviterId is defined, update the inviter's balance
      if (userInviter) {
        updateSuccess = await updateBalanceDemo(userInviter, amountToAdd);
      }
      const guessedNumber = parseInt(betTypeOrNumber);
      playerDemo = { userId, username: ctx.message.from.username || ctx.message.from.first_name, betType: guessedNumber, amount: betAmount };
      Demoplayers.push(playerDemo);
      ctx.reply(`Bet placed: @${ctx.message.from.username} bet on the number ${guessedNumber}${getPocketEmoji(guessedNumber)} with 🪙${amount}. on Demo`);
  
    } else {
      ctx.reply(`Please @${ctx.message.from.username} Dm @fp_blackjackbot and fund your account.`);
    }
  } else {
    ctx.reply('*Invalid number bet format.* \n Use /betd <number> <amount>.\n Min 10, Max 1000', { parse_mode: 'Markdown' });
  }
}

async function handleBetTypeDemo(ctx, userId, userBalance, userInviter, betTypeOrNumber, amount) {
  if (isValidBetType(betTypeOrNumber) && isValidAmount(amount)) {
    const betAmount = parseInt(amount);
    console.log('Response sent:', betAmount);
    const percentageToAdd = 0.01;
    const amountToAdd = Math.ceil(betAmount * percentageToAdd);
    console.log(userInviter);

    if (userBalance >= betAmount) {
      let balanceUpdateSuccess = false;
      let updateSuccess = false;

      // Deduct user's bet amount
      balanceUpdateSuccess = await deductBalance(userId, betAmount);

      // If inviterId is defined, update the inviter's balance
      if (userInviter) {
        updateSuccess = await updateBalance(userInviter, amountToAdd);
      }

      playerDemo = { userId, username: ctx.message.from.username || ctx.message.from.first_name, betType: betTypeOrNumber.toLowerCase(), amount: betAmount };
      Demoplayers.push(playerDemo);
      ctx.reply(`Bet placed: @${ctx.message.from.username} bet on ${betTypeOrNumber} with 🪙${amount}. on Demo`);  
    } else {
      ctx.reply(`Please @${ctx.message.from.username} Dm @fp_blackjackbot and fund your account.`);
    }
  } else {
    ctx.reply('*Invalid bet format.* \n Use /betd <type> <amount>.\n Min 10, Max 1000', { parse_mode: 'Markdown' });
  }
}


bot.command('scoreboard', async (ctx) => {
  try {
    const scoreboardData = await getScoreboard();

    if (scoreboardData.length === 0) {
      ctx.reply('No scoreboard data available.');
      return;
    }

    const scoreboardMessage = scoreboardData
      .map(({ username, score }) => `@${sanitizeUsername(username)}: ${score}`)
      .join('\n');

    const messageText = `*Scoreboard:*📈\n${scoreboardMessage}`;

    // Send message with Markdown parse mode
    await ctx.reply(messageText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling scoreboard command:', error);

    // Log the error details
    ctx.reply(`An error occurred: ${error.message}`);

    // You might want to log additional information, such as the content of the message
    console.error('Message content:', ctx.message.text);
  }
});

bot.command('scoreboardDemo', async (ctx) => {
  try {
    const scoreboardData = await getScoreboardDemo();

    if (scoreboardData.length === 0) {
      ctx.reply('No scoreboard data available.');
      return;
    }

    const scoreboardMessage = scoreboardData
      .map(({ username, scoredemo }) => `@${sanitizeUsername(username)}: ${scoredemo}`)
      .join('\n');

    const messageText = `*Demo Scoreboard:*📈\n${scoreboardMessage}`;

    // Send message with Markdown parse mode
    await ctx.reply(messageText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling scoreboard command:', error);

    // Log the error details
    ctx.reply(`An error occurred: ${error.message}`);

    // You might want to log additional information, such as the content of the message
    console.error('Message content:', ctx.message.text);
  }
});

function sanitizeUsername(username) {
  // Replace underscores with an empty string or another character
  return username.replace(/_/g, '');
}



function closeBets(ctx) {
    // Announce the bets placed
    isBettingClosed = true;
    const betsSummary = players.map(player => {
      const sanitizedUsername = sanitizeUsername(player.username);
      if (typeof player.betType === 'number') {
        return `@${sanitizedUsername} bet 🪙${player.amount} on the number ${player.betType}${getPocketEmoji(player.betType)}.`;
      } else {
        return `@${sanitizedUsername} bet 🪙${player.amount} on ${player.betType}.`;
      }
    });

    const betsDemoSummary = Demoplayers.map(playerDemo => {
      const sanitizedUsername = sanitizeUsername(playerDemo.username);
      if (typeof playerDemo.betType === 'number') {
        return `@${sanitizedUsername} bet 🪙${playerDemo.amount} on the number ${playerDemo.betType}${getPocketEmoji(playerDemo.betType)} on Demo.`;
      } else {
        return `@${sanitizedUsername} bet 🪙${playerDemo.amount} on ${playerDemo.betType} on Demo.`;
      }
    });
    const imagePath = 'Cards/startroulette.gif';  // Change this to the actual path of your image
    const imageStream = fs.createReadStream(imagePath);
    // Send the bets summary
    ctx.replyWithAnimation({ source: imageStream }, {
        caption: `*Bets are now closed.*🔒\n*Spinning the roulette wheel...*\n\n*Bets placed:*\n${betsSummary.join('\n')}\n\n${betsDemoSummary.join('\n')}`,
        parse_mode: 'Markdown',
    });

    // Wait for 5 seconds before executing the endgame
    setTimeout(() => {
      if (isGameRunning) {
        endGame(ctx);
      }
    },5000);
  }

  const maxCaptionLength = 1000;  // Adjust this based on the maximum allowed caption length

// Function to calculate remaining caption
function getRemainingCaption(message, maxLength) {
  if (message.length <= maxLength) {
    return { remaining: '', exceeded: false };
  }

  const remaining = message.substring(maxLength);
  return { remaining, exceeded: true };
}
async function endGame(ctx) {
  isGameRunning = false;



  // Simulate roulette wheel spin
  const winningNumber = Math.floor(Math.random() * 3); // 0-36

  // Store the winning number in the array
  pastWinningNumbers.push(winningNumber);



  // Determine winners and losers
  const straightUpWinners = players.filter(player => {
    return typeof player.betType === 'number' && player.betType === winningNumber;
  });
  const straightUpWinnersDemo = Demoplayers.filter(playerDemo => {
    return typeof playerDemo.betType === 'number' && playerDemo.betType === winningNumber;
  });
  const otherWinners = players.filter(player => {
    // Check if the bet matches the winning number or type
    return (
      (player.betType === 'green' && winningNumber === 0) ||
      (player.betType === 'red' && winningNumber % 2 === 1 && winningNumber !== 0) ||
      (player.betType === 'black' && winningNumber % 2 === 0 && winningNumber !== 0) ||
      (player.betType === 'odd' && winningNumber % 2 === 1 && winningNumber !== 0) ||
      (player.betType === 'even' && winningNumber % 2 === 0 && winningNumber !== 0) ||
      (player.betType === 'high' && winningNumber >= 19 && winningNumber !== 0) ||
      (player.betType === 'low' && winningNumber <= 18 && winningNumber !== 0) ||
      (player.betType === 'green' && winningNumber === 0)
    );
  });

  const otherWinnersDemo = Demoplayers.filter(playerDemo => {
    // Check if the bet matches the winning number or type
    return (
      (playerDemo.betType === 'green' && winningNumber === 0) ||
      (playerDemo.betType === 'red' && winningNumber % 2 === 1 && winningNumber !== 0) ||
      (playerDemo.betType === 'black' && winningNumber % 2 === 0 && winningNumber !== 0) ||
      (playerDemo.betType === 'odd' && winningNumber % 2 === 1 && winningNumber !== 0) ||
      (playerDemo.betType === 'even' && winningNumber % 2 === 0 && winningNumber !== 0) ||
      (playerDemo.betType === 'high' && winningNumber >= 19 && winningNumber !== 0) ||
      (playerDemo.betType === 'low' && winningNumber <= 18 && winningNumber !== 0) ||
      (playerDemo.betType === 'green' && winningNumber === 0)
    );
  });
  
  // Announce the round summary
  const roundSummary = `*Finished Round*🎉 \n\nNumber: ${winningNumber}${getPocketEmoji(winningNumber)}\nColor: ${getColor(winningNumber)}\nParity: ${getParity(winningNumber)}\nHigh/Low: ${getHighLow(winningNumber)}\n`;
  

  const straightUpWinningsSummary = await Promise.all(
    [
      ...straightUpWinners.map(async (winner) => {
        try {
          const straightUpMultiplier = calculateMultiplier('straightup', winningNumber, winner.betType);
          const straightUpWinnings = winner.amount * straightUpMultiplier;
          const sanitizedUsername = sanitizeUsername(winner.username);

          if (playerWinnings[winner.username]) {
            playerWinnings[winner.username].totalWinnings += straightUpWinnings;
            playerWinnings[winner.username].totalMultipliers += straightUpMultiplier;
            playerWinnings[winner.username].multipliers.push(straightUpMultiplier);
            
            playerWinnings[winner.username].userIds.add(winner.userId);
          } else {
            playerWinnings[winner.username] = {
              totalWinnings:  straightUpWinnings,
              totalMultipliers: straightUpMultiplier,
              multipliers: [straightUpMultiplier],
              userIds: new Set([winner.userId]),
            };
          }
          return `@${sanitizedUsername} won 🪙${straightUpWinnings} with a straight-up bet on ${winningNumber}!`;;
        } catch (error) {
          console.error(`Error processing other winner: ${error.message}`);
          return `Error processing other winner: ${error.message}`;
        }
      }),

      // Iterate through playerWinnings and update player score and balance
      ...Object.entries(playerWinnings).map(async ([username, { totalWinnings, totalMultipliers, multipliers, userIds }]) => {
        try {
          await updatePlayerScore(username, totalMultipliers);
          await updateBalance(Array.from(userIds), totalWinnings, totalMultipliers);
        } catch (error) {
          console.error(`Error updating score and balance for ${username}: ${error.message}`);
        }
        for (const key in playerWinnings) {
          delete playerWinnings[key];
        }
      }),

      // Assuming otherWinnersDemo is an array
      ...straightUpWinnersDemo.map(async(winner) =>{
        try {
          const straightUpMultiplier = calculateMultiplier('straightup', winningNumber, winner.betType);
          const straightUpWinnings = winner.amount * straightUpMultiplier;
          const sanitizedUsername = sanitizeUsername(winner.username);
          await updatePlayerScoreDemo(winner.username, straightUpMultiplier);
          await updateBalanceDemo(winner.userId, straightUpWinnings, straightUpMultiplier);
          return `@${sanitizedUsername} won 🪙${straightUpWinnings} with a straight-up bet on ${winningNumber} on Demo !`;
        } catch (error) {
          console.error(`Error processing other winner (Demo): ${error.message}`);
          return `Error processing other winner (Demo): ${error.message}`;
        }
      })
    ]
  );




  const otherWinningsSummary = await Promise.all(
    [
      ...otherWinners.map(async (winner) => {
        try {
          const multiplier = calculateMultiplier(winner.betType);
          const winnings = winner.amount * multiplier;
          const sanitizedUsername = sanitizeUsername(winner.username);

          if (playerWinnings[winner.username]) {
            playerWinnings[winner.username].totalWinnings += winnings;
            playerWinnings[winner.username].totalMultipliers += multiplier;
            playerWinnings[winner.username].multipliers.push(multiplier);
            playerWinnings[winner.username].userIds.add(winner.userId);
          } else {
            playerWinnings[winner.username] = {
              totalWinnings: winnings,
              totalMultipliers: multiplier,
              multipliers: [multiplier],
              userIds: new Set([winner.userId]),
            };
          }

          return `@${sanitizedUsername} won 🪙${winnings} with a ${winner.betType} bet on ${winningNumber}!`;
        } catch (error) {
          console.error(`Error processing other winner: ${error.message}`);
          return `Error processing other winner: ${error.message}`;
        }
      }),

      // Iterate through playerWinnings and update player score and balance
      ...Object.entries(playerWinnings).map(async ([username, { totalWinnings, totalMultipliers, multipliers, userIds }]) => {
        try {
          await updatePlayerScore(username, totalMultipliers);
          await updateBalance(Array.from(userIds), totalWinnings, totalMultipliers);
        } catch (error) {
          console.error(`Error updating score and balance for ${username}: ${error.message}`);
        }
        for (const key in playerWinnings) {
          delete playerWinnings[key];
        }
      }),

      // Assuming otherWinnersDemo is an array
      ...otherWinnersDemo.map(async (winner) => {
        try {
          const multiplier = calculateMultiplier(winner.betType);
          const winnings = winner.amount * multiplier;
          const sanitizedUsername = sanitizeUsername(winner.username);

          // Assuming these functions handle errors properly
          await updatePlayerScoreDemo(winner.username, multiplier);
          await updateBalanceDemo(winner.userId, winnings, multiplier);

          return `@${sanitizedUsername} won 🪙${winnings} with a ${winner.betType} bet on ${winningNumber} on Demo!`;
        } catch (error) {
          console.error(`Error processing other winner (Demo): ${error.message}`);
          return `Error processing other winner (Demo): ${error.message}`;
        }
      })
    ]
  );

  
  
  // Announce losers
  const losersSummary = players
    .filter(player => !straightUpWinners.includes(player) && !otherWinners.includes(player))
    .map(loser => {
      const sanitizedUsername = sanitizeUsername(loser.username);
      return `@${sanitizedUsername} lost 🪙${loser.amount} with a ${loser.betType} bet.`;
    });

    const loserdemoSummary = Demoplayers.filter(playerDemo => !straightUpWinnersDemo.includes(playerDemo) && !otherWinnersDemo.includes(playerDemo))
    .map(loser => {
      const sanitizedUsername = sanitizeUsername(loser.username);
      return `@${sanitizedUsername} lost 🪙${loser.amount} with a ${loser.betType} bet on Demo.`;
    });

  // Combine all summaries into a single reply
  const replyMessage = `${roundSummary}\n*Winners:*🥳\n${straightUpWinningsSummary.concat(otherWinningsSummary).join('\n')}\n\n*Losers:*😞\n${losersSummary.join('\n')} \n${loserdemoSummary.join('\n')}`;

  // Include the past winning numbers in the reply
  const last10PastWinningNumbers = pastWinningNumbers.slice(-12);
  const pastNumbersMessage = ` ⏪ *Last Round:*\n ${last10PastWinningNumbers
    .map((number, index) => `${number}${getPocketEmoji(number)}${(index + 1) % 4 === 0 ? '\n' : ', '}`)
    .join('')}`;

  // Load image stream
  const imagePath = 'Cards/fairplay.jpg';  // Change this to the actual path of your image
  const imageStream = fs.createReadStream(imagePath);

  // Generate the initial caption
  const initialCaption = `${replyMessage}\n\n${pastNumbersMessage}`;
  const { remaining, exceeded } = getRemainingCaption(initialCaption, maxCaptionLength);

  // Send the initial message with image and part of the caption
  ctx.replyWithPhoto({ source: imageStream }, {
    caption: initialCaption.substring(0, maxCaptionLength), parse_mode: 'Markdown',
  });

  // Send the remaining caption in a separate reply if it exceeds the limit
  if (exceeded) {
    ctx.reply(remaining, { parse_mode: 'Markdown' });
  }

  // Reset game-related variables
  players = [];
  isGameRunning = false;

  // Set a timeout to begin a new round after a delay
  setTimeout(() => {
    if (!isGameRunning) {
      begin(ctx);
    }
  }, 10000);
}

async function updateBalance(userId, amount, multiplierscore) {
  try {
    const response = await axios.post('http://localhost:3001/api/mazbo/update-balance', {
      userId,
      gamePoints: amount,
      scorePoints: multiplierscore,
    });

    console.log(`Balance updated for ${userId}. Updated Amount: ${amount}`);
  } catch (error) {
    console.error(`Error updating balance for ${userId}: ${error.message}`);
    // Handle the error as needed (e.g., log it, send an alert)
  }
}

async function deductBalance(userId, amount) {
  try {
    const response = await axios.post('http://localhost:3001/api/mazbo/player-lost', {
      userId,
      gamePointsLost:amount,
    });

    console.log(`Balance updated for ${userId}. Response: ${amount}`);
    return true; // Return true to indicate a successful balance update
  } catch (error) {
    console.error(`Error updating balance for ${userId}: ${error.message}`);
    return false; // Return false to indicate a failed balance update
  }
}

async function updateBalanceDemo(userId, amount, multiplierscore) {
  try {
    const response = await axios.post('http://localhost:3001/api/mazbo/update-balance-demo', {
      userId,
      gamePoints: amount,
      scorePoints: multiplierscore,
    });

    console.log(`Balance updated for ${userId}. Response: ${amount}`);
  } catch (error) {
    console.error(`Error updating balance for ${userId}: ${error.message}`);
    // Handle the error as needed (e.g., log it, send an alert)
  }
}

async function deductBalanceDemo(userId, amount) {
  try {
    const response = await axios.post('http://localhost:3001/api/mazbo/player-lost-demo', {
      userId,
      gamePointsLost:amount,
    });

    console.log(`Balance updated for ${userId}. Response: ${amount}`);
    return true; // Return true to indicate a successful balance update
  } catch (error) {
    console.error(`Error updating balance for ${userId}: ${error.message}`);
    return false; // Return false to indicate a failed balance update
  }
}
async function sendTelegramMessage(chatId, message) {
  try {
    await bot.telegram.sendMessage(chatId, message);
    console.log(`Telegram message sent to ${chatId}: ${message}`);
    return true;
  } catch (error) {
    console.error(`Error sending Telegram message to ${chatId}: ${error.message}`);
    console.log(error)
    return false;
  }
}

async function begin(ctx) {
  if (!isGameRunning) {
    isGameRunning = true;
    gameStarter = ctx.message.from.id; // Record who started the game
    players = [];
    Demoplayers = [];
    isBettingClosed = false;

    // Get the information from the last 10 rounds
    const last10PastWinningNumbers = pastWinningNumbers.slice(-12);
    const last10RoundsInfo = last10PastWinningNumbers
    .map((number, index) => `${number}${getPocketEmoji(number)}${(index + 1) % 4 === 0 ? '\n' : ', '}`)
    .join('');
  
   

    const scoreboardDemo = await getScoreboardDemo();
// Check if there is data to display
if (scoreboardDemo.length === 0) {
  ctx.reply('No scoreboard data available.');
}

// Take the first 10u 0 elements from scoreboardData
const topDemoPlayers = scoreboardDemo.slice(0, 30);

// Format the data for display
const nonZeroTopDemoPlayers = topDemoPlayers.filter(({ scoredemo }) => scoredemo !== 0);

const scoreboardDemoMessage = nonZeroTopDemoPlayers.slice(0, 10)
  .map(({ username, scoredemo }, index) => `${index + 1}. @${sanitizeUsername(username)}: ${scoredemo}`)
  .join('\n');


  const scoreboardData = await getScoreboard();
  // Check if there is data to display
  if (scoreboardData.length === 0) {
    ctx.reply('No scoreboard data available.');
  }
  
  // Take the first 10u 0 elements from scoreboardData
  const topPlayers = scoreboardData.slice(0, 30);
  
  // Format the data for display
  const nonZeroTopPlayers = topPlayers.filter(({ score }) => score !== 0);
  
  const scoreboardMessage = nonZeroTopPlayers.slice(0, 10)
    .map(({ username, score }, index) => `${index + 1}. @${sanitizeUsername(username)}: ${score}`)
    .join('\n');
// Rest of your code remains unchanged
const imagePath = 'Cards/startroulette.gif';  // Change this to the actual path of your image
const imageStream = fs.createReadStream(imagePath);


console.log('Caption:', `
  🎊*A new round has started!*🎊 \n\n ⏪ *Last* *Rounds:* \n${last10RoundsInfo}\n\n*Scoreboard:*📈\n${scoreboardMessage}\n\n*Scoreboard:*📈\n${scoreboardDemoMessage}\n\n*Place your bets using*\n /bet <type> <amount>.
`);

    // Send the image followed by the announcement of a new round and information from the last 10 rounds
    ctx.replyWithAnimation({ source: imageStream }, {
      caption: `
      🎊*A new round has started!*🎊 \n\n ⏪ *Last* *Rounds:* \n${last10RoundsInfo}\n\n 🎊*Get Ready For Upcoming $10,000💰 weekly Gaming🎲 Competition*🎊 \n\n*Scoreboard:*📈\n${scoreboardMessage}\n\n*Scoreboard Demo:*📈\n${scoreboardDemoMessage}\n\n*Place your bets using*\n /bet <type> <amount>.`,
      parse_mode: 'Markdown', // Specify parse_mode explicitly
    });
      betClosedTimeoutSet = true;
      betClosedTimeout = setTimeout(() => {
        if (isGameRunning) {
          closeBets(ctx);
        }
      }, 20000);
    

    // Automatically close the bets after 10 seconds of the first bet
  } else {
    ctx.reply('A game is already in progress.');
  }
};

// Helper function to get color based on the winning number
function getColor(number) {
  if (number === 0) {
    return 'Green';
  } else {
    return number % 2 === 0 ? 'Black' : 'Red';
  }
}

// Helper function to get parity based on the winning number
function getParity(number) {
  return number % 2 === 0 ? 'Even' : 'Odd';
}

// Helper function to get High/Low based on the winning number
function getHighLow(number) {
  return number >= 19 ? 'High' : 'Low';
}

// Helper function to calculate the multiplier for different bet types
function calculateMultiplier(betType, winningNumber, guessedNumber) {
  // If the bet is on a color, parity, etc. and the player wins, multiply the winnings by 2
  if (
    betType === 'red' ||
    betType === 'black' ||
    betType === 'odd' ||
    betType === 'even' ||
    betType === 'high' ||
    betType === 'low'
  ) {
    return 2;
  }

  // If the bet is on a specific number and the player wins, multiply the winnings by 36
  if (typeof guessedNumber === 'number' && guessedNumber === winningNumber) {
    return 36;
  }

  // If the bet is on green and the player wins, multiply the winnings by 18
  if (betType === 'green') {
    return 18;
  }

  // Default multiplier for other cases
  return 0; // This should be adjusted based on your game rules
}

// Helper function to check if a number bet is valid
function isValidNumberBet(number) {
  return parseInt(number) >= 0 && parseInt(number) <= 36;
}

// Helper function to check if a bet type is valid
function isValidBetType(betType) {
  const validTypes = ['red', 'black', 'odd', 'even', 'high', 'low', 'green'];
  return validTypes.includes(betType.toLowerCase());
}



function getLosers(players, winningNumber) {
  // Filter out players who won on a straight-up bet
  const filteredPlayers = players.filter(player => player.betType !== 'straightup');

  // Return the remaining players
  return filteredPlayers.filter(player => player.betType !== winningNumber);
}
// Helper function to check if an amount is valid
function isValidAmount(amount) {
  const validAmountRegex = /^\d+$/;
  const isValidFormat = validAmountRegex.test(amount);
  const numericAmount = parseInt(amount, 10);
  const isInRange = numericAmount >= 10 && numericAmount <= 1000;

  return isValidFormat && isInRange;
}



// Helper function to get a pocket emoji based on the winning number
function getPocketEmoji(number) {
  if (number === 0 || number === 37) {
    return '🟢';
  } else if (number % 2 === 0 && number !== 0) {
    return '⚫️';
  } else {
    return '🔴';
  }
}

async function updatePlayerScore(username, winnings) {
  if (playerScores[username]) {
    playerScores[username] += winnings;
  } else {
    playerScores[username] = winnings;
  }
}

async function updatePlayerScoreDemo(username, winnings) {
  if (playerScoresDemo[username]) {
    playerScoresDemo[username] += winnings;
  } else {
    playerScoresDemo[username] = winnings;
  }
}
// Function to get the scoreboard
async function getScoreboard() {
  {
    try {
      const response = await fetch('http://localhost:3001/api/mazbo/scoreboard/');
      
      if (!response.ok) {
        throw new Error('Failed to fetch scoreboard data');
      }
  
      const scoreboardData = await response.json();
  
      // Extract only the "userId" and "score" fields from each player
      const simplifiedData = scoreboardData.map(({ userId, score }) => ({ userId, score }));
  
      // Fetch usernames for each user ID
      const userDataWithUsernames = await Promise.all(
        simplifiedData.map(async ({ userId, score }) => {
          try {
            const chat = await bot.telegram.getChat(userId);
            const username = chat.username || chat.first_name // Use 'N/A' if no username is found
            return { username, score };
          } catch (error) {
            console.error(`Error fetching username for user ID ${userId}:`, error.message);
            return { username: 'N/A', score }; // Use 'N/A' if an error occurs
          }
        })
      );
  
      console.log('Scoreboard Data with Usernames:', userDataWithUsernames);
      
      return userDataWithUsernames;
    } catch (error) {
      console.error('Error fetching scoreboard:', error.message);
      throw error; // Rethrow the error for the calling function to handle
    }
  }
  
}

// Example usage
getScoreboard().then((data) => {
  // Do something with the simplified scoreboard data
  console.log('Simplified Scoreboard data received:', data);
});





async function getScoreboardDemo() {
  {
    try {
      const response = await fetch('http://localhost:3001/api/mazbo/scoreboardDemo/');
      
      if (!response.ok) {
        throw new Error('Failed to fetch scoreboard data');
      }
  
      const scoreboardData = await response.json();
  
      // Extract only the "userId" and "score" fields from each player
      const simplifiedData = scoreboardData.map(({ userId, scoredemo }) => ({ userId, scoredemo }));
  
      // Fetch usernames for each user ID
      const userDataWithUsernames = await Promise.all(
        simplifiedData.map(async ({ userId, scoredemo }) => {
          try {
            const chat = await bot.telegram.getChat(userId);
            const username = chat.username || chat.first_name // Use 'N/A' if no username is found
            return { username, scoredemo };
          } catch (error) {
            console.error(`Error fetching username for user ID ${userId}:`, error.message);
            return { username: 'N/A', scoredemo }; // Use 'N/A' if an error occurs
          }
        })
      );
  
      console.log('ScoreboardDemo Data with Usernames:', userDataWithUsernames);
      
      return userDataWithUsernames;
    } catch (error) {
      console.error('Error fetching scoreboard:', error.message);
      throw error; // Rethrow the error for the calling function to handle
    }
  }
  
}

// Example usage
getScoreboardDemo().then((data) => {
  // Do something with the simplified scoreboard data
  console.log('Simplified Scoreboard data received:', data);
});



bot.launch().then(() => {
  console.log('Bot has started');
});
