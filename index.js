const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, 'data.json');
const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

function readDB() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ accounts: [], transactions: [], counter: 1 }, null, 2));
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8') || '{}';
  return JSON.parse(raw);
}
function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) throw new Error('Invalid amount');
  return Math.round(n * 100);
}
function fromCents(cents) {
  return (cents / 100).toFixed(2);
}

function httpError(res, status, message) {
  return res.status(status).json({ error: message });
}

function validateAmountField(req, res, next) {
  const { amount } = req.body;
  if (amount === undefined) return httpError(res, 400, 'amount is required');
  try {
    const cents = toCents(amount);
    if (cents <= 0) return httpError(res, 400, 'amount must be greater than 0');
    req.amountCents = cents;
    next();
  } catch (err) {
    return httpError(res, 400, 'invalid amount format');
  }
}

app.get('/', (req, res) => res.json({ service: 'simple-bank', status: 'ok', time: new Date().toISOString() }));

app.post('/accounts', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') return httpError(res, 400, 'name is required');
  const db = readDB();
  const id = db.counter++;
  let balanceCents = 0;
  if (req.body.initialDeposit !== undefined) {
    try {
      balanceCents = toCents(req.body.initialDeposit);
      if (balanceCents < 0) return httpError(res, 400, 'initialDeposit cannot be negative');
    } catch (err) {
      return httpError(res, 400, 'invalid initialDeposit');
    }
  }
  const account = {
    id: String(id),
    uuid: uuidv4(),
    name: name.trim(),
    balanceCents,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.accounts.push(account);

  if (balanceCents > 0) {
    db.transactions.push({
      id: uuidv4(),
      accountId: account.id,
      type: 'DEPOSIT',
      amountCents: balanceCents,
      balanceAfterCents: balanceCents,
      description: 'Initial deposit',
      createdAt: new Date().toISOString()
    });
  }
  writeDB(db);

  const resp = { id: account.id, name: account.name, balance: fromCents(account.balanceCents), createdAt: account.createdAt };
  return res.status(201).json(resp);
});

app.get('/accounts', (req, res) => {
  const db = readDB();
  const list = db.accounts.map(a => ({
    id: a.id,
    name: a.name,
    balance: fromCents(a.balanceCents),
    createdAt: a.createdAt
  }));
  res.json(list);
});

app.get('/accounts/:id', (req, res) => {
  const db = readDB();
  const acc = db.accounts.find(a => a.id === req.params.id);
  if (!acc) return httpError(res, 404, 'account not found');
  res.json({
    id: acc.id,
    name: acc.name,
    balance: fromCents(acc.balanceCents),
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt
  });
});

app.put('/accounts/:id', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') return httpError(res, 400, 'name is required');
  const db = readDB();
  const acc = db.accounts.find(a => a.id === req.params.id);
  if (!acc) return httpError(res, 404, 'account not found');
  acc.name = name.trim();
  acc.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json({ id: acc.id, name: acc.name });
});

app.delete('/accounts/:id', (req, res) => {
  const db = readDB();
  const idx = db.accounts.findIndex(a => a.id === req.params.id);
  if (idx === -1) return httpError(res, 404, 'account not found');
  const acc = db.accounts[idx];
  if (acc.balanceCents !== 0) return httpError(res, 400, 'account balance must be zero to delete');
  db.accounts.splice(idx, 1);
  db.transactions = db.transactions.filter(t => t.accountId !== req.params.id);
  writeDB(db);
  res.status(204).send();
});

app.post('/accounts/:id/deposit', validateAmountField, (req, res) => {
  const db = readDB();
  const acc = db.accounts.find(a => a.id === req.params.id);
  if (!acc) return httpError(res, 404, 'account not found');
  acc.balanceCents += req.amountCents;
  acc.updatedAt = new Date().toISOString();
  const tx = {
    id: uuidv4(),
    accountId: acc.id,
    type: 'DEPOSIT',
    amountCents: req.amountCents,
    balanceAfterCents: acc.balanceCents,
    description: req.body.description || 'Deposit',
    createdAt: new Date().toISOString()
  };
  db.transactions.push(tx);
  writeDB(db);
  res.json({ transactionId: tx.id, balance: fromCents(acc.balanceCents) });
});

app.post('/accounts/:id/withdraw', validateAmountField, (req, res) => {
  const db = readDB();
  const acc = db.accounts.find(a => a.id === req.params.id);
  if (!acc) return httpError(res, 404, 'account not found');
  if (acc.balanceCents < req.amountCents) return httpError(res, 400, 'insufficient funds');
  acc.balanceCents -= req.amountCents;
  acc.updatedAt = new Date().toISOString();
  const tx = {
    id: uuidv4(),
    accountId: acc.id,
    type: 'WITHDRAW',
    amountCents: req.amountCents,
    balanceAfterCents: acc.balanceCents,
    description: req.body.description || 'Withdraw',
    createdAt: new Date().toISOString()
  };
  db.transactions.push(tx);
  writeDB(db);
  res.json({ transactionId: tx.id, balance: fromCents(acc.balanceCents) });
});

app.post('/transfer', (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;
  if (!fromAccountId || !toAccountId) return httpError(res, 400, 'fromAccountId and toAccountId required');
  if (fromAccountId === toAccountId) return httpError(res, 400, 'cannot transfer to same account');
  let amountCents;
  try {
    amountCents = toCents(amount);
    if (amountCents <= 0) return httpError(res, 400, 'amount must be greater than 0');
  } catch (err) {
    return httpError(res, 400, 'invalid amount');
  }
  const db = readDB();
  const from = db.accounts.find(a => a.id === String(fromAccountId));
  const to = db.accounts.find(a => a.id === String(toAccountId));
  if (!from) return httpError(res, 404, 'fromAccount not found');
  if (!to) return httpError(res, 404, 'toAccount not found');
  if (from.balanceCents < amountCents) return httpError(res, 400, 'insufficient funds in fromAccount');

  from.balanceCents -= amountCents;
  to.balanceCents += amountCents;
  const now = new Date().toISOString();
  from.updatedAt = now; to.updatedAt = now;

  const txOut = {
    id: uuidv4(),
    accountId: from.id,
    type: 'TRANSFER_OUT',
    amountCents,
    balanceAfterCents: from.balanceCents,
    counterpartyAccountId: to.id,
    description: req.body.description || `Transfer to ${to.id}`,
    createdAt: now
  };
  const txIn = {
    id: uuidv4(),
    accountId: to.id,
    type: 'TRANSFER_IN',
    amountCents,
    balanceAfterCents: to.balanceCents,
    counterpartyAccountId: from.id,
    description: req.body.description || `Transfer from ${from.id}`,
    createdAt: now
  };
  db.transactions.push(txOut, txIn);
  writeDB(db);

  res.json({
    transferId: uuidv4(),
    from: { id: from.id, balance: fromCents(from.balanceCents) },
    to: { id: to.id, balance: fromCents(to.balanceCents) }
  });
});

app.get('/transactions', (req, res) => {
  const db = readDB();
  const { accountId } = req.query;
  let list = db.transactions.slice().reverse(); 
  if (accountId) list = list.filter(t => t.accountId === String(accountId));
  const out = list.map(t => ({
    id: t.id,
    accountId: t.accountId,
    type: t.type,
    amount: fromCents(t.amountCents),
    balanceAfter: fromCents(t.balanceAfterCents),
    counterpartyAccountId: t.counterpartyAccountId || null,
    description: t.description,
    createdAt: t.createdAt
  }));
  res.json(out);
});

app.get('/accounts/:id/transactions', (req, res) => {
  const db = readDB();
  const acc = db.accounts.find(a => a.id === req.params.id);
  if (!acc) return httpError(res, 404, 'account not found');
  const txs = db.transactions.filter(t => t.accountId === acc.id).map(t => ({
    id: t.id,
    type: t.type,
    amount: fromCents(t.amountCents),
    balanceAfter: fromCents(t.balanceAfterCents),
    description: t.description,
    createdAt: t.createdAt
  })).reverse();
  res.json(txs);
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Simple Bank API running on port ${PORT}`);
});
