1. 数据库：运行位于database.js中的database.js文件，需要修改其中的文本内容（包括密码，create_tables.sql的相对路径）

2. 下面是postman测试
/*所有的测试必须先基于登录测试！
登录测试：/api/login
{
  "username": "siyichen_tom@rutgers.edu",
  "password": "123456"
}
购买股票测试：
/api/buy-stock
{
  "symbol": "huohuf1y",
  "quantity": 10
}
充钱测试/api/deposit
{
 "amount": 200
}
查看正在账户上买入的股票：
查看卖出的股票：


