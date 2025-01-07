const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser'); // 引入 csv-parser
const math = require('mathjs');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise'); // 使用 mysql2 的 Promise 接口
const { fetchRealTimeStockPrice } = require('./BuyStocks.js');
const moment = require('moment');

var username1;
// 配置 CORS，允许来自 http://127.0.0.1:3001 的请求
const corsOptions = {
    origin: 'http://127.0.0.1:3001',  // 允许的前端源
    credentials: true,  // 允许携带凭据
};

// 使用 CORS 中间件
app.use(cors(corsOptions));

// mysql数据库连接配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Chensiyi@010312', // 替换为你的 MySQL 密码
    database: 'Stock_analysis_system',//替换一下数据库名
  };

// 数据库连接池
const pool = mysql.createPool(dbConfig);
// 存储用户数据（可以扩展为数据库）这个之后可能要换掉

app.use(bodyParser.json());
app.use(express.json());  // 解析 JSON 请求体

// 注册接口
app.post('/api/register', async (req, res) => {
    console.log('Request received:', req.body);
    const { username, password } = req.body; //接收到请求的body
    try{
        const connection = await pool.getConnection();
        const [existingUser] = await connection.query('SELECT email FROM users WHERE email = ?', [username]);
        if (existingUser.length > 0) {
            connection.release();
            return res.json({ success: false, message: '用户名已存在' });
        }
        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入用户数据
        await connection.query('INSERT INTO users (email, password) VALUES (?, ?)', [
        username,
        hashedPassword,
        ]);
        connection.release();
        res.json({ success: true, message: '注册成功' });
        } catch (err) {
            console.error('Error registering user:', err);  // 打印错误信息
            res.status(500).send('Error registering user.');
    }
});

// 登录接口
app.post('/api/login', async(req, res) => {
    console.log('Request received:', req.body);
    const { username, password } = req.body;

    try{
        const connection = await pool.getConnection();
        // 获取用户数据
        const [user] = await connection.query('SELECT * FROM users WHERE email = ?', [username]);
        if (user.length === 0) {
        connection.release();
        return res.json({ success: false, message: '用户名不存在' });
        }
        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user[0].password);
        if (!isPasswordValid) {
        connection.release();
        return res.json({ success: false, message: '密码错误' });
        }
        username1=username;//保存客户的文件名
        console.log('Username is',username1)
        connection.release();
        return res.json({ success: true, message: '登录成功' });
    }catch{
        console.error('Error registering user:', err);  // 打印错误信息
        res.status(500).send('Error logging in.');
    }
});

// 修改密码接口
app.put('/api/change-password', async (req, res) => {
    console.log('change password Request received:', req.body);
    const { oldPassword, newPassword } = req.body;
    try {
      const connection = await pool.getConnection();
  
      // 获取用户数据
      const [user] = await connection.query('SELECT * FROM users WHERE email = ?', [username1]);
      if (user.length === 0) {
        connection.release();
        return res.json({ success: false, message: '用户不存在' });
      }
      // 验证旧密码
      const isPasswordValid = await bcrypt.compare(oldPassword, user[0].password);
      if (!isPasswordValid) {
        connection.release();
        return res.json({ success: false, message: 'Invalid old password.' });
      }
      //确保新旧密码不一样
      if(oldPassword===newPassword){
        connection.release();
        return res.json({ success: false, message: 'The old password and new password is the same' });
      }
      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 10); 
      // 更新密码
      await connection.query('UPDATE users SET password = ? WHERE email = ?', [hashedNewPassword, username1]);  
      connection.release();
      return res.json({ success: true, message: '密码修改成功' });
    } catch (err) {
      console.error('Error registering user:', err);  // 打印错误信息
      res.status(500).send('Error updating password.');
    }
  });

// 用户充值余额接口
app.post('/api/deposit', async (req, res) => {
    const { amount } = req.body;
    try {
        const connection = await pool.getConnection();
        // 查询用户是否存在
        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [username1]);
        if (users.length === 0) {
            connection.release();
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // 更新账户余额
        await connection.query('UPDATE users SET balance = balance + ? WHERE email = ?', [amount, username1]);

        connection.release();
        res.json({ success: true, message: `Successfully deposited $${amount} into ${username1}'s account.` });
    } catch (error) {
        console.error('Error processing deposit:', error.message);
        res.status(500).json({ success: false, message: 'Error processing deposit.' });
    }
});

//购买股票,你先需要登录再进入程序，因为你不登录就不知道账户
app.post('/api/buy-stock', async (req, res) => {
    const { symbol, quantity } = req.body;
    
    const connection = await pool.getConnection();
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }  
    try {
        //查询用户账上的钱
        const [userRows] = await connection.query('SELECT balance FROM users WHERE email = ?', [username1]);
        const userBalance = userRows[0].balance;
        console.log('账户余额是',userBalance);
    
      // 获取实时股票价格
      const price = await fetchRealTimeStockPrice(symbol);
      console.log('Success in fetching the price', price);
      // 计算交易金额
      const totalCost = price * quantity;
      let timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        console.log('usrename1',username1);
    //判断账户余额是否足够
        if (userBalance < totalCost) {
            return res.status(400).json({
              error: 'Insufficient balance',
              userBalance,
              totalCost,
            });
          }
    console.log('Your account balance is',userBalance,'Your The stock total price you purchase is',totalCost);
      // 将交易记录保存到数据库的
      await connection.query('INSERT INTO stock_transactions (timestamp, email, stock_name, number, current_price, is_sold) VALUES (?, ?, ?, ?, ?, ?)', [
        timestamp,
        username1,
        symbol,
        quantity,
        price,
        '0',
      ]);
      //Just for test
      console.log(`timestamp ${timestamp} User ${username1} bought ${quantity} shares of ${symbol} at $${price} each. Total cost: $${totalCost}`);
      //设置钱
      await connection.query('UPDATE users SET balance = balance - ? WHERE email = ?', [totalCost, username1]);
      connection.release();
  
      res.json({
        message: 'Stock purchase successful',
        data: { username1, symbol, quantity, price, totalCost },
      });
    } catch (error) {
      console.error('Error processing deposit:', error.message);
      res.status(500).json({ error: `Failed to fetch stock price for ${symbol}` });
    }
  });

//卖股票, 传入时间戳，删除股票的数量
app.post('/api/sell-stock', async (req, res) => {
    const { timestamp, quantity } = req.body;
    
    const connection = await pool.getConnection();
    if (!timestamp || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }  
    try {
        //查询要卖出股票的数量和价格
        const [quantity] = await connection.query('SELECT number,stock_name FROM stock_transactions WHERE timestamp = ?', [timestamp]);
        const stockNumber = quantity[0].number;
        const stockName = quantity[0].stock_name;
        console.log('这笔交易用户买了多少支股票',stockNumber);
    
      // 获取实时股票价格
      const price = await fetchRealTimeStockPrice(symbol);
      console.log('Success in fetching the price', price);
      // 计算卖出股票金额
      const totalCost = price * quantity;
      let timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        console.log('usrename1',username1);
    //判断账户余额是否足够
        if (stockNumber < quantity) {
            return res.status(400).json({
              error: 'Cannot execute the process for over-amount of price',
              userBalance,
              totalCost,
            });
          }
    console.log('Your account balance is',userBalance,'Your The stock total price you purchase is',totalCost);
      // 将交易记录保存到数据库的
      await connection.query('INSERT INTO stock_transactions (timestamp, email, stock_name, number, current_price, is_sold) VALUES (?, ?, ?, ?, ?, ?)', [
        timestamp,
        username1,
        symbol,
        quantity,
        price,
        '0',
      ]);
      //Just for test
      console.log(`timestamp ${timestamp} User ${username1} bought ${quantity} shares of ${symbol} at $${price} each. Total cost: $${totalCost}`);
      //设置钱
      await connection.query('UPDATE users SET balance = balance - ? WHERE email = ?', [totalCost, username1]);
      connection.release();
  
      res.json({
        message: 'Stock purchase successful',
        data: { username1, symbol, quantity, price, totalCost },
      });
    } catch (error) {
      console.error('Error processing deposit:', error.message);
      res.status(500).json({ error: `Failed to fetch stock price for ${symbol}` });
    }
  });
  
// 查看用户正在买入的股票接口 (is_sold = FALSE)
app.get('/api/active-stocks', async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.query(
        'SELECT * FROM stock_transactions WHERE email = ? AND is_sold = FALSE',
        [username1]
      );
      connection.release();
       // 使用 moment.js 将时间从 UTC 转换为本地时间，并格式化
 const dataWithLocalTime = rows.map(row => {
    // moment(row.timestamp) 默认会处理时区，转为本地时间
    const localTime = moment(row.timestamp).local().format('YYYY-MM-DD HH:mm:ss');
    return {
      ...row,
      timestamp: localTime,  // 将转换后的本地时间设置回数据
    };
  });
      res.json({
        message: 'Active stocks retrieved successfully',
        data: dataWithLocalTime,
      });
    } catch (error) {
      console.error('Error fetching active stocks:', error.message);
      res.status(500).json({ error: 'Failed to retrieve active stocks' });
    }
  });
  
  // 查看用户已经卖出的股票 (is_sold = TRUE)
  app.get('/api/sold-stocks', async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.query(
        'SELECT * FROM stock_transactions WHERE email = ? AND is_sold = TRUE',
        [username1]
      );
      connection.release();
      // 使用 moment.js 将时间转换为本地时间
      // 使用 moment.js 将时间从 UTC 转换为本地时间，并格式化
 const dataWithLocalTime = rows.map(row => {
    // moment(row.timestamp) 默认会处理时区，转为本地时间
    const localTime = moment(row.timestamp).local().format('YYYY-MM-DD HH:mm:ss');
    return {
      ...row,
      timestamp: dataWithLocalTime,  // 将转换后的本地时间设置回数据
    };
  });
      res.json({
        message: 'Sold stocks retrieved successfully',
        data: localTime,
      });
    } catch (error) {
      console.error('Error fetching sold stocks:', error.message);
      res.status(500).json({ error: 'Failed to retrieve sold stocks' });
    }
  });

app.get('/api/stocks', (req, res) => {
    const stockCodes = [];

    // 假设 CSV 文件名为 'stocks.csv'
    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('headers', (headers) => {
            console.log('Headers:', headers);  // 打印 headers 以确认是否正确获取
            stockCodes.push(...headers.slice(1));  // 从第二列开始（跳过 DATE 列）
        })
        .on('data', (row) => {
            // console.log('Row:', row);  // 打印每一行数据
        })
        .on('end', () => {
            console.log('CSV File Read Complete');
            res.json({ success: true, stocks: stockCodes });
        })
        .on('error', (err) => {
            console.log('Error:', err);
            res.json({ success: false, message: '读取CSV文件出错' });
        });
});

// 获取投资建议的接口
app.get('ge', (req, res) => {
    const stockTicker = req.query.stock;
    const period = parseInt(req.query.period, 10); // 1年、2年、5年
    const initialCapital = parseFloat(req.query.capital); // 初始资金

    // 根据投资年限自动设置风险百分比和止损百分比
    let stopLossPercentage;
    let riskPercentage;

    if (period === 1) { // 短期投资（1年）
        stopLossPercentage = 5; // 止损百分比 5%
        riskPercentage = 2; // 风险百分比 2%
    } else if (period === 2) { // 中期投资（2年）
        stopLossPercentage = 10; // 止损百分比 10%
        riskPercentage = 3; // 风险百分比 3%
    } else if (period === 5) { // 长期投资（5年）
        stopLossPercentage = 15; // 止损百分比 15%
        riskPercentage = 3; // 风险百分比 3%
    } else {
        return res.json({ success: false, message: 'Invalid period specified.' });
    }

    // 读取股票历史数据
    const stockData = [];
    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('data', (row) => {
            if (row['DATE/TICKER'] && row[stockTicker]) {
                const price = parseFloat(row[stockTicker]);
                // 验证价格是否为有效数字
                if (!isNaN(price) && price >= 0) {
                    stockData.push({ date: row['DATE/TICKER'], price: price });
                }
            }
        })
        .on('end', () => {
            if (stockData.length === 0) {
                return res.json({ success: false, message: '没有有效的股票数据可用' });
            }

            // 基于 stockData 做技术分析
            const movingAverage = calculateMovingAverage(stockData, period);
            if (movingAverage.length === 0) {
                return res.json({ success: false, message: '无法计算移动平均线，数据不足' });
            }

            const { strategy, buyQuantity } = generateStrategy(stockData, movingAverage, initialCapital, stopLossPercentage, riskPercentage);
            const frequency = getSuggestedFrequency(period);

            res.json({
                success: true,
                strategy: strategy,
                buyQuantity: buyQuantity, // 返回买入数量
                frequency: frequency,
            });
        })
        .on('error', (err) => {
            console.log('Error:', err);
            res.json({ success: false, message: '读取股票数据失败' });
        });
});

// 获取股票的趋势数据
app.get('/api/stock-trend', (req, res) => {
    const stockTicker = req.query.stock;

    if (!stockTicker) {
        return res.json({ success: false, message: 'Stock ticker is required.' });
    }

    // 设置2019年1月1日为过滤的起点，格式化为YYYYMMDD
    const startDate = 20200101;

    const stockData = [];
    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('data', (row) => {
            if (row['DATE/TICKER'] && row[stockTicker]) {
                const price = parseFloat(row[stockTicker]);
                if (!isNaN(price)) {
                    // 获取日期并转换为数字格式（YYYYMMDD）
                    const rowDate = parseInt(row['DATE/TICKER'], 10);

                    // 只保留2019年1月1日之后的数据
                    if (rowDate >= startDate) {
                        stockData.push({ date: row['DATE/TICKER'], price });
                    }
                }
            }
        })
        .on('end', () => {
            if (stockData.length === 0) {
                return res.json({ success: false, message: 'No data available for this stock after 2019.' });
            }

            res.json({ success: true, data: stockData });
        })
        .on('error', (err) => {
            console.error(err);
            res.json({ success: false, message: 'Error reading stock data.' });
        });
});

app.get('/api/multiplestock-analysis', (req, res) => {
    const stockTickers = req.query.stocks;  // 接收多个股票代码，以逗号分隔
    if (!stockTickers) {
        return res.json({ success: false, message: 'Stock tickers are required.' });
    }

    const tickers = stockTickers.split(',');  // 分割多个股票代码
    const stocksData = [];
    const startDate = 20190102; // 设置2019年1月1日为过滤的起点

    let count = 0;  // 用于跟踪已处理股票的数量
    const allDates = new Set();  // 用于存储所有股票的日期集合

    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('headers', (headers) => {
            // headers部分不再需要存储所有股票代码
        });

    tickers.forEach(ticker => {
        const stockData = [];
        fs.createReadStream(__dirname + '/output.csv')
            .pipe(csv())
            .on('data', (row) => {
                if (row['DATE/TICKER'] && row[ticker]) {
                    const price = parseFloat(row[ticker]);
                    if (!isNaN(price)) {
                        const rowDate = parseInt(row['DATE/TICKER'], 10);

                        if (rowDate >= startDate) {
                            stockData.push({ date: rowDate, price });
                            allDates.add(rowDate);  // 将日期添加到集合中
                        }
                    }
                }
            })
            .on('end', () => {
                if (stockData.length === 0) {
                    return res.json({ success: false, message: `No data available for stock ${ticker} after 2019.` });
                }

                // 填充缺失的日期
                fillMissingDates(stockData, allDates);

                stocksData.push({
                    ticker: ticker,
                    prices: stockData.map(data => data.price),
                    dates: stockData.map(data => data.date)
                });

                count++;

                // 如果所有股票数据都已处理完，执行投资组合分析
                if (count === tickers.length) {
                    const portfolioWeights = meanVarianceOptimization(stocksData);
                    res.json({
                        success: true,
                        portfolioWeights: portfolioWeights // 只返回投资组合权重
                    });
                }
            })
            .on('error', (err) => {
                console.error(err);
                res.json({ success: false, message: 'Error reading stock data.' });
            });
    });
});




// 填充缺失的日期（确保所有股票的日期对齐）
function fillMissingDates(stockData, allDates) {
    const dates = Array.from(allDates).sort((a, b) => a - b);  // 将所有日期排序
    const dateSet = new Set(dates);  // 创建一个日期集合用于快速查找

    // 对每个股票的数据进行填充
    const filledData = [];
    let currentIndex = 0;

    // 遍历所有日期
    dates.forEach(date => {
        if (stockData[currentIndex] && stockData[currentIndex].date === date) {
            // 如果当前日期有数据，直接加入
            filledData.push(stockData[currentIndex]);
            currentIndex++;
        } else {
            // 如果当前日期没有数据，填充为与前一个日期相同的价格
            const previousPrice = filledData[filledData.length - 1]?.price || 0;
            filledData.push({ date: date, price: previousPrice });
        }
    });

    // 更新股票数据
    stockData.length = 0;  // 清空原数据
    stockData.push(...filledData);  // 将填充后的数据加入
}

// 计算股票的日收益率
function calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
        returns.push(dailyReturn);
    }
    console.log(returns);
    return returns;
}

// 计算标准差
function calculateStandardDeviation(returns) {
    // 检查是否包含 Infinity 或 -Infinity
    const invalidValues = returns.filter(r => r === Infinity || r === -Infinity);
    if (invalidValues.length > 0) {
        console.error('Invalid values found in returns array:', invalidValues);
        return NaN;  // 如果存在无效值，返回 NaN
    }

    // 计算均值
    const mean = math.mean(returns);
    console.log('Mean:', mean);

    // 计算方差
    const variance = math.mean(returns.map(r => Math.pow(r - mean, 2)));
    console.log('Variance:', variance);

    // 返回标准差
    const stddev = Math.sqrt(variance);
    console.log('Standard Deviation:', stddev);

    return stddev;
}


// 计算相关性
function calculateCorrelation(returns1, returns2) {
    return math.corr(returns1, returns2);
}

// 均值-方差优化 (简单版本：目标是最小化风险)
function meanVarianceOptimization(stocksData) {
    const returns = stocksData.map(stock => calculateReturns(stock.prices));
    const risks = stocksData.map(stock => calculateStandardDeviation(returns[stocksData.indexOf(stock)]));
    const correlations = [];

    // 计算股票之间的相关性
    for (let i = 0; i < stocksData.length; i++) {
        for (let j = i + 1; j < stocksData.length; j++) {
            const correlation = calculateCorrelation(returns[i], returns[j]);
            correlations.push(correlation);
        }
    }

    // 此处简化模型，我们可以基于波动性和相关性来估算组合的最优权重
    // 例如，我们可以根据每个股票的风险和相关性进行权重分配
    const totalRisk = risks.reduce((acc, risk) => acc + risk, 0);
    const weights = risks.map(risk => risk / totalRisk);  // 简单分配权重，较低风险的股票获得更多权重

    return weights;
}



// 计算简单的移动平均线
function calculateMovingAverage(data, period) {
    if (data.length < period) return []; // 数据不足，返回空数组

    const prices = data.map(item => item.price);
    let movingAvg = [];
    for (let i = 0; i < prices.length - period + 1; i++) {
        const avg = prices.slice(i, i + period).reduce((a, b) => a + b, 0) / period;
        movingAvg.push({ date: data[i + period - 1].date, avg: avg });
    }
    return movingAvg;
    }

// 计算最近 N 天的平均值
    function calculateRecentAverage(data, days) {
        if (data.length < days) return null; // 数据不足
        const recentData = data.slice(-days); // 取最近 N 天的数据
        const avg = recentData.reduce((sum, item) => sum + item.price, 0) / days;
        return avg;
    }

// 计算止损价位
    function calculateStopLoss(stockPrice, stopLossPercentage) {
        return stockPrice * (1 - stopLossPercentage / 100); // 止损价
}

// 基于短期和长期趋势生成改进后的交易策略，并返回买入数量
function generateStrategy(stockData, movingAverage, initialCapital, stopLossPercentage, riskPercentage) {
    const recentAvg = calculateRecentAverage(stockData, 10); // 最近 10 天的平均值
    const longTermAvg = movingAverage[movingAverage.length - 1]?.avg; // 长期平均值（最后一个移动平均值）

    if (recentAvg == null || longTermAvg == null) {
        return { strategy: "Not enough data to generate a strategy.", buyQuantity: 0 };
    }

    let strategy = "Hold the stock.";
    let buyQuantity = 0;
    const stockPrice = stockData[stockData.length - 1]?.price; // 获取当前股价

    // 改进的策略：短期平均值与长期平均值的对比
    if (recentAvg > longTermAvg) {
        strategy = "Buy the stock.";

        // 基于资金管理和风险管理计算买入数量
        buyQuantity = calculateBuyQuantity(initialCapital, stockPrice, stopLossPercentage, riskPercentage);
    } else if (recentAvg < longTermAvg) {
        strategy = "Sell the stock.";
    }

    return { strategy, buyQuantity };
}

// 根据止损和风险管理计算买入数量
function calculateBuyQuantity(accountBalance, stockPrice, stopLossPercentage, riskPercentage) {
    const stopLossPrice = calculateStopLoss(stockPrice, stopLossPercentage); // 止损价
    const stopLossAmount = stockPrice - stopLossPrice; // 每股亏损的金额
    const maxRiskAmount = accountBalance * (riskPercentage / 100); // 最大允许亏损
    const buyQuantity = Math.floor(maxRiskAmount / stopLossAmount); // 计算买入的数量
    return buyQuantity;
}

// 根据投资期返回建议的交易频率
function getSuggestedFrequency(period) {
    if (period === 1) return 'Quarterly';
    if (period === 2) return 'Semi-annually';
    return 'Annually';
}


app.get('/api/portfolio-recommendation', (req, res) => {
    const { investmentYears, maxPortfolioSize } = req.query;

    // 参数验证
    if (!investmentYears || !maxPortfolioSize) {
        return res.json({ success: false, message: 'investmentYears and maxPortfolioSize are required.' });
    }

    const investmentYearsInt = parseInt(investmentYears, 10);
    const maxPortfolioSizeInt = parseInt(maxPortfolioSize, 10);

    if (isNaN(investmentYearsInt) || isNaN(maxPortfolioSizeInt)) {
        return res.json({ success: false, message: 'investmentYears and maxPortfolioSize must be valid numbers.' });
    }

    const stocks = [];
    const stockPrices = {};
    const allDates = new Set();
    const startDate = 20190102; // 设置2019年1月2日为过滤起点。

    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('headers', (headers) => {
            // 从 headers 获取所有股票代码（去掉 'DATE/TICKER' 列）
            headers.forEach(header => {
                if (header !== 'DATE/TICKER') {
                    stocks.push(header);
                    stockPrices[header] = [];
                }
            });
        })
        .on('data', (row) => {
            // 遍历每一行数据，读取每个股票的价格
            const rowDate = parseInt(row['DATE/TICKER'], 10);

            if (rowDate >= startDate) { // 只处理大于或等于 20190102 的数据
                stocks.forEach(stock => {
                    const price = parseFloat(row[stock]);

                    if (!isNaN(price)) {
                        stockPrices[stock].push({ date: rowDate, price });
                        allDates.add(rowDate);  // 添加日期到 allDates 集合
                    }
                });
            }
        })
        .on('end', () => {
            // 对每只股票数据填充缺失日期
            stocks.forEach(stock => {
                fillMissingDates(stockPrices[stock], allDates);
            });

            // 对股票数据进行分析
            const returnsData = {};
            const correlationMatrix = {};

            // 计算每只股票的收益率
            stocks.forEach(stock => {
                returnsData[stock] = calculateReturns(stockPrices[stock].map(d => d.price));
            });

            // 计算相关性矩阵
            for (let i = 0; i < stocks.length; i++) {
                for (let j = i + 1; j < stocks.length; j++) {
                    const stockA = stocks[i];
                    const stockB = stocks[j];

                    const correlation = calculateCorrelation(returnsData[stockA], returnsData[stockB]);

                    if (!correlationMatrix[stockA]) correlationMatrix[stockA] = {};
                    if (!correlationMatrix[stockB]) correlationMatrix[stockB] = {};

                    correlationMatrix[stockA][stockB] = correlation;
                    correlationMatrix[stockB][stockA] = correlation;
                }
            }

            // 分类相关性对
            const highCorrelationPairs = [];
            const lowCorrelationPairs = [];
            const negativeCorrelationPairs = [];

            for (let i = 0; i < stocks.length; i++) {
                for (let j = i + 1; j < stocks.length; j++) {
                    const stockA = stocks[i];
                    const stockB = stocks[j];
                    const correlation = correlationMatrix[stockA][stockB];

                    if (correlation > 0.8) {
                        highCorrelationPairs.push({ stockA, stockB, correlation });
                    } else if (correlation < 0.3 && correlation >= 0) {
                        lowCorrelationPairs.push({ stockA, stockB, correlation });
                    } else if (correlation < 0) {
                        negativeCorrelationPairs.push({ stockA, stockB, correlation });
                    }
                }
            }

            // 根据投资年限选择投资组合
            const selectedStocks = new Set();

            if (investmentYearsInt > 3) {
                // 选择高相关性股票
                highCorrelationPairs.forEach(({ stockA, stockB }) => {
                    if (selectedStocks.size < maxPortfolioSizeInt) {
                        if (!selectedStocks.has(stockA)) {
                            selectedStocks.add(stockA);
                        }
                        if (selectedStocks.size < maxPortfolioSizeInt && !selectedStocks.has(stockB)) {
                            selectedStocks.add(stockB);
                        }
                    }
                });

                // 选择低相关性股票
                lowCorrelationPairs.forEach(({ stockA, stockB }) => {
                    if (selectedStocks.size < maxPortfolioSizeInt) {
                        if (!selectedStocks.has(stockA)) {
                            selectedStocks.add(stockA);
                        }
                        if (selectedStocks.size < maxPortfolioSizeInt && !selectedStocks.has(stockB)) {
                            selectedStocks.add(stockB);
                        }
                    }
                });
            } else {
                lowCorrelationPairs.forEach(({ stockA, stockB }) => {
                    if (selectedStocks.size < maxPortfolioSizeInt) {
                        if (!selectedStocks.has(stockA)) {
                            selectedStocks.add(stockA);
                        }
                        if (selectedStocks.size < maxPortfolioSizeInt && !selectedStocks.has(stockB)) {
                            selectedStocks.add(stockB);
                        }
                    }
                });
            }

// 只返回最大数量的股票
            const finalSelectedStocks = Array.from(selectedStocks).slice(0, maxPortfolioSizeInt);

            res.json({
                success: true,
                selectedStocks: finalSelectedStocks
            });

        })
        .on('error', (err) => {
            console.error(err);
            res.json({ success: false, message: 'Error processing stock data.' });
        });
});


// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
