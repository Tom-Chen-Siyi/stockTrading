# Stock Trading Application

## Project Overview

This is a stock trading application built with Node.js and Express.js, supporting the following features:

![image-20241223111412652](images/image-20241223111412652.png)

- User registration and login
- Stock buying and selling
- Viewing the user's held stocks
- Providing investment advice for single or multiple stocks
- Analyzing stock trends and view historical charts



------

## Environment Requirements

- Node.js 
- postman(used to test the backend code)
- MySQL Database(workbench)

------

## Program Running Steps

1. **Install dependencies:**

   ```bash
   npm install 
   cd frontend
   npm install
   ```

2. **Configure the database:**

   - Create a database in MySQL.

   - configure the following variables:

     ```env
     host: '127.0.0.1',
         user: 'root',
         port: 3307,
         password: '1234',
         database: 'Stock_analysis_system'
     ```

3. **Start the server(backend):**

   ```bash
   cd server
   node server.js
   ```

First, start the backend part. The backend server is running on the port 3000.

4. **Start the frontend:**

	cd frontend
	npx http-server -p 3001 --cors

Then start the frontend part. The service will run at `http://localhost:3001`.

------

## API Route Overview

### **1. User Management**

#### Register User

**POST** `/register`

- Parameters
  - `username` (string)
  - `password` (string)
- **postman test(input and return format)**:

![image-20241223111516060](images/image-20241223111516060.png)

#### Login User

**POST** `/login`

- Parameters
  - `username` (string)
  - `password` (string)
- **postman test(input and return format)**:

![image-20241223111623226](images/image-20241223111623226.png)

------

### **2. Stock Trading and Portfolio Management**

#### Buy Stock

**POST** `/buy-stock`

- Parameters
  - `symbol` (stock ticker, e.g., AAPL)
  - `quantity` (number of shares)
- Logic
  1. Retrieve user balance.
  2. Query real-time stock price.
  3. Calculate total cost and verify if balance is sufficient.
  4. Record the transaction and update the balance.
- **postman test(input and return format)**:

![image-20241223111705782](images/image-20241223111705782.png)

#### View Held Stocks

**GET** `/active-stocks`

- Logic
  - Retrieve the stocks that the user holds and has not sold.
  - Format timestamps to local time.
- **postman test(input and return format)**:

![image-20241223111752360](images/image-20241223111752360.png)

------

### **3. Investment Advice**

#### Single Stock Investment Advice

**GET** `/advice`

- Parameters
  - `symbol` (stock ticker)
  - `period` (investment years, e.g., 3)
  - `capital` (initial money, e.g., 3000)
- Logic：
  - Get single stock advice based on historical data and provide recommendations.
- **postman test(input and return format)**:

![image-20241223112020483](images/image-20241223112020483.png)

.

#### Portfolio Investment Advice

**GET** `/portfolio-recommendation`

- Parameters
  - `investmentYears` (investment years, e.g., 3)
  - `maxPortfolioSize` (maximum portfolio size, e.g., 5)
- Logic
  - Read data from the `output.csv` file.
  - Fill missing dates and calculate return rates for each stock.
  - Build a correlation matrix and select stocks based on investment years and correlation.
- **postman test(input and return format)**:.

![image-20241223112105226](images/image-20241223112105226.png)

------

### **4. Analyze Multiple Stocks**

**GET** `/multiplestock-analysis`

- Parameters
  - `stocks` (comma-separated stock tickers, e.g., huohuf1y,huohuf2m)
- Logic
  - return portfolilo weights for each stocks.
- **postman test(input and return format)**:.

![image-20241223112205404](images/image-20241223112205404.png)

------

## Data File Explanation

- `output.csv`

  : Stores historical stock price data.

  - Format: `<Date>,<Stock Symbol>,<Open Price>,<High Price>,<Low Price>,<Close Price>,<Volume>`

------

## Database Structure

### Users Table (`users`)

| Field    | Description     |
| -------- | --------------- |
| email    | User name       |
| password | Hashed Password |
| balance  | User Balance    |

### Transactions Table (`transactions`)

| Field         | Description                  |
| ------------- | ---------------------------- |
| email         | User name                    |
| symbol        | Stock Name                   |
| number        | quantity the user has bought |
| current price |                              |
| is_sold       | Whether Sold                 |
| timestamp     | Transaction Timestamp        |

------

