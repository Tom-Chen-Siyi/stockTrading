const mysql = require('mysql2');
const fs = require('fs');

// 创建连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // 替换为你的数据库用户名
  password: '', // 替换为你的 MySQL 密码
  database: '', // 这里不指定数据库，因为我们需要先创建数据库
  connectionLimit: 10
});

// 连接到 MySQL 数据库
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }

  // 执行创建数据库语句
  connection.query('CREATE DATABASE IF NOT EXISTS user_management', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      connection.release();
      return;
    }

    console.log('Database created successfully!');
    
    // 选择数据库
    connection.query('USE user_management', (err) => {
      if (err) {
        console.error('Error selecting database:', err);
        connection.release();
        return;
      }

      // 创建 users 表
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          email VARCHAR(255) PRIMARY KEY, 
          password VARCHAR(255) NOT NULL, 
          balance DECIMAL(10, 2) DEFAULT 0.00  
        );
      `;

      // 创建 stock_transactions 表
      const createStockTransactionsTable = `
        CREATE TABLE IF NOT EXISTS stock_transactions (
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP PRIMARY KEY,  
          email VARCHAR(255) NOT NULL, 
          stock_name VARCHAR(255) NOT NULL, 
          number INT NOT NULL,  
          current_price DECIMAL(10, 2) NOT NULL, 
          is_sold BOOLEAN DEFAULT FALSE  
        );
      `;

      // 执行创建表格的 SQL 语句
      connection.query(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          connection.release();
          return;
        }
        
        console.log('Users table created successfully!');
        
        connection.query(createStockTransactionsTable, (err) => {
          if (err) {
            console.error('Error creating stock_transactions table:', err);
            connection.release();
            return;
          }
          
          console.log('Stock transactions table created successfully!');
          connection.release();
        });
      });
    });
  });
});