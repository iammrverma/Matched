const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const JWT_SECRET = "your_super_secret_key"; // Use a hardcoded secret for now

// MySQL database connection configuration
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mysql@3t",
  database: "matched",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// User registration endpoint
app.post("/api/register", (req, res) => {
  const { email, password, department, secretCode } = req.body;

  if (!email || !password || !department) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (department === "cfo" && secretCode !== "####"){
    return res.status(403).json({ error: "Invalid secret code" });
  }
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error("Error hashing password:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const sql = "INSERT INTO users (email, password, department) VALUES (?, ?, ?)";
    db.query(sql, [email, hash, department], (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json({ success: true, message: "User registered successfully" });
    });
  });
});

// User login endpoint
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error("Error comparing passwords:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (!match) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ email: user.email, department: user.department }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({ success: true, token });
    });
  });
});

// Middleware to verify the JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // If no token, unauthorized

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // If token is invalid or expired, forbidden
    console.log("User authenticated:", user);
    req.user = user;
    next();
  });
}

// Protected endpoint to fetch entries (restricted to CFO)
app.get("/api/entries", authenticateToken, (req, res) => {
  const { department } = req.user;
  console.log("Fetching entries for department:", department);
  if (department === "cfo") {
    const sql = "SELECT * FROM entries";
    db.query(sql, (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json(result);
    });
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
});

// Protected endpoint to add entries (restricted to Finance and Accounts departments)
app.post("/api/entries", authenticateToken, (req, res) => {
  const { department } = req.user;
  console.log("Adding entry for department:", department);
  if (department === "finance" || department === "accounts") {
    const { department, mailid, type, amount, entry_date, name, accountNumber } = req.body;
    if (!name || !accountNumber) {
      res.status(400).json({ error: "Name and account number are required" });
      return;
    }
    const sql = "INSERT INTO entries (department, mailid, type, amount, entry_date, name, acc_number) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [department, mailid, type, amount, entry_date, name, accountNumber], (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json({ success: true, message: "Entry added successfully", id: result.insertId });
    });
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});


/*
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "_jwt_secret_key";

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// MySQL database connection configuration
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mysql@3t", // "Mysql@1",
  database: "matched",
});
// connecting database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database");
});
// User registration endpoint
app.post("/api/register", (req, res) => {
  const { email, password, department } = req.body;

  if (!email || !password || !department) {
    return res.status(400).json({ error: "All fields are required" });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error("Error hashing password:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const sql = "INSERT INTO users (email, password, department) VALUES (?, ?, ?)";
    db.query(sql, [email, hash, department], (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json({ success: true, message: "User registered successfully" });
    });
  });
});
// User login endpoint
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error("Error comparing passwords:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (!match) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ email: user.email, department: user.department }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({ success: true, token });
    });
  });
});

// Middleware to verify the JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // If no token, unauthorized

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // If token is invalid or expired, forbidden
    req.user = user;
    next();
  });
}

// Endpoint to verify access
app.post("/api/verifyAccess", (req, res) => {
  const { department, email } = req.body;

  let tableName;
  switch (department) {
    case "finance":
      tableName = "finance_access";
      break;
    case "accounts":
      tableName = "accounts_access";
      break;
    case "cfo":
      tableName = "cfo_access";
      break;
    default:
      return res.status(400).json({ error: "Invalid department" });
  }

  const sql = `SELECT * FROM ${tableName} WHERE mailid = ?`;
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (result.length > 0) {
      res.json({ accessGranted: true, department });
    } else {
      res.json({ accessGranted: false });
    }
  });
});

// Endpoint to fetch entries (restricted to CFO)
app.get("/api/entries", authenticateToken, (req, res) => {
  const { department } = req.user;
  if (department === "cfo") {
    const sql = "SELECT * FROM entries";
    db.query(sql, (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json(result);
    });
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
});

// Endpoint to post entries (for finance and accounts)
app.post("/api/entries", authenticateToken, (req, res) => {
  const { department } = req.user;
  if (department === "finance" || department === "accounts") {
    const { department, mailid, type, amount, entry_date, name, accountNumber } = req.body;
    if (!name || !accountNumber) {
      res.status(400).json({ error: "Name and account number are required" });
      return;
    }
    const sql = "INSERT INTO entries (department, mailid, type, amount, entry_date, name, acc_number) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [department, mailid, type, amount, entry_date, name, accountNumber], (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json({ success: true, message: "Entry added successfully", id: result.insertId });
    });
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
});

// Endpoint to request access
app.post("/api/requestAccess", (req, res) => {
  const { department, email } = req.body;
  const sql = "INSERT INTO access_requests (department, mailid) VALUES (?, ?)";
  db.query(sql, [department, email], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.json({ success: true, message: "Access request submitted successfully" });
  });
});

app.post("/api/acceptAccess",  (req, res) => {
  // const { department } = req;
  const { requestDepartment , requestMailid } = req.body;
  const tableName = `${requestDepartment}_access`;
  const sql = `INSERT INTO ${tableName} (mailid) VALUES (?)`;
  db.query(sql, [requestMailid], (err, result) => {
    if (err){
      console.error("Error executing query", err);
      res.status(500).json({error: "Internal server error"});
      return;
    }
    res.json({ success:true, message:"Request accepted successfully"});
  });
});
app.post("/api/deleteAccessRequest", (req, res) => {
  const { requestId } = req.body;
  const sql = "DELETE FROM access_requests WHERE id = ?"; // Corrected table name

  db.query(sql, [requestId], (err, result) => {
    if (err) {
      console.error("Error deleting request:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.json({ success: true, message: "Request deleted successfully" });
  });
});

// app.get("/api/accessRequests", checkAccess, (req, res) => {
//   const { department } = req;
//   if (department === "cfo") {
//     const sql = "SELECT * FROM access_requests";
//     db.query(sql, (err, result) => {
//       if (err) {
//         console.error("Error executing query:", err);
//         res.status(500).json({ error: "Internal server error" });
//         return;
//       }
//       res.json(result);
//     });
//   } else {
//     res.status(403).json({ error: "Unauthorized" });
//   }
// });

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
*/