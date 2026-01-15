# PayOS Payout APIs - Lệnh Chi

> **API Version**: Latest  
> **Base URL**: https://api-merchant.payos.vn  
> **Category**: Payout / Disbursement

---

## 📌 Tổng Quan

Payout APIs cho phép bạn tạo lệnh chi (chuyển tiền) từ tài khoản PayOS đến tài khoản ngân hàng khác.

**Use cases:**
- Hoàn tiền cho khách hàng
- Thanh toán lương/thưởng
- Chi trả cho đối tác/supplier

---

## 🔑 Authentication

### Headers Required

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
x-idempotency-key: UNIQUE_REQUEST_ID
x-signature: HMAC_SHA256_SIGNATURE
Content-Type: application/json
```

### New Headers for Payout

| Header | Required | Description |
|--------|----------|-------------|
| `x-idempotency-key` | ✅ | Unique ID để tránh duplicate requests |
| `x-signature` | ✅ | Chữ ký xác thực request body |

---

## 📖 Phần 1: Tạo Lệnh Chi Đơn

### POST /v1/payouts

Tạo lệnh chi đơn giản (single payout)

**URL**: `https://api-merchant.payos.vn/v1/payouts`

---

### 📤 Request Headers

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
x-idempotency-key: payout_1737012345_abc123
x-signature: <computed_signature>
Content-Type: application/json
```

---

### 📋 Request Body Schema

```json
{
  "referenceId": "payout_123",
  "amount": 100000,
  "description": "Thanh toan luong",
  "toBin": "970415",
  "toAccountNumber": "123456789",
  "category": ["salary"]
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `referenceId` | string | ✅ | Mã tham chiếu (unique) |
| `amount` | integer | ✅ | Số tiền VND (integer only) |
| `description` | string | ✅ | Mô tả lệnh chi |
| `toBin` | string | ✅ | Mã ngân hàng đích (Bank BIN code) |
| `toAccountNumber` | string | ✅ | Số tài khoản đích |
| `category` | Array<string> | ❌ | Danh mục (salary, bonus, refund, etc.) |

**Common Bank BIN codes:**
- MB Bank: `970422`
- Vietcombank: `970436`
- Techcombank: `970407`
- BIDV: `970418`
- VietinBank: `970415`
- ACB: `970416`

---

### 🔐 Signature Generation

**Algorithm**: HMAC-SHA256

**Data to sign** (sorted alphabetically):
```
amount=$amount&description=$description&referenceId=$referenceId&toAccountNumber=$toAccountNumber&toBin=$toBin
```

**Example:**
```typescript
import crypto from 'crypto';

function generatePayoutSignature(payoutData: {
    referenceId: string;
    amount: number;
    description: string;
    toBin: string;
    toAccountNumber: string;
}) {
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY!;
    
    // Sort alphabetically
    const dataString = `amount=${payoutData.amount}&description=${payoutData.description}&referenceId=${payoutData.referenceId}&toAccountNumber=${payoutData.toAccountNumber}&toBin=${payoutData.toBin}`;
    
    const signature = crypto
        .createHmac('sha256', checksumKey)
        .update(dataString)
        .digest('hex');
    
    return signature;
}
```

---

### ✅ Response - Success (200)

**Response Headers:**
```
x-signature: <response_signature>
```

**Response Body:**
```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "id": "payout_123456789",
    "referenceId": "ref_123456789",
    "transactions": [
      {
        "id": "txn_123456789",
        "referenceId": "ref_123456789",
        "amount": 100000,
        "description": "Thanh toan",
        "toBin": "970422",
        "toAccountNumber": "123456789",
        "toAccountName": "NGUYEN VAN A",
        "state": "PROCESSING"
      }
    ],
    "category": ["salary"],
    "approvalState": "PROCESSING",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | string | Payout ID của PayOS |
| `data.referenceId` | string | Reference ID của bạn |
| `data.transactions` | array | Danh sách transactions |
| `data.transactions[].state` | string | PROCESSING, SUCCEEDED, FAILED |
| `data.approvalState` | string | PROCESSING, SUCCEEDED, FAILED |
| `data.createdAt` | string | Thời gian tạo |

---

### ❌ Error Responses

#### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `AMOUNT_NOT_INTEGER` | Amount không phải số nguyên | Check amount value |
| `BALANCE_NOT_ENOUGH` | Số dư không đủ | Top up PayOS account |
| `INVALID_DESTINATION` | Tài khoản đích không hợp lệ | Verify account number & BIN |
| `PAYOUT_LIMIT_REACHED` | Đạt giới hạn giao dịch | Contact PayOS support |
| `PAYOUT_MAX_EXCEEDED_PER_TIME` | Vượt số tiền max mỗi lần | Reduce amount |
| `PAYOUT_MIN_EXCEEDED_PER_TIME` | Dưới số tiền min | Increase amount |
| `DUPLICATE_IDEMPOTENCY_KEY` | Trùng idempotency key | Use new unique key |
| `INVALID_IDEMPOTENCY_KEY` | Invalid idempotency key | Check key format |
| `PAYMENT_REQUEST_DATA_SIGNATURE_INCORRECT` | Chữ ký sai | Verify signature generation |

---

### 💻 Implementation Example

```typescript
// lib/payos-payout.ts
import crypto from 'crypto';

interface PayoutData {
    referenceId: string;
    amount: number;
    description: string;
    toBin: string;
    toAccountNumber: string;
    category?: string[];
}

export async function createPayout(payoutData: PayoutData) {
    try {
        const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID!;
        const PAYOS_API_KEY = process.env.PAYOS_API_KEY!;
        const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY!;
        
        // Generate idempotency key
        const idempotencyKey = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Generate signature
        const dataString = `amount=${payoutData.amount}&description=${payoutData.description}&referenceId=${payoutData.referenceId}&toAccountNumber=${payoutData.toAccountNumber}&toBin=${payoutData.toBin}`;
        
        const signature = crypto
            .createHmac('sha256', CHECKSUM_KEY)
            .update(dataString)
            .digest('hex');
        
        // Make API call
        const response = await fetch('https://api-merchant.payos.vn/v1/payouts', {
            method: 'POST',
            headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
                'x-idempotency-key': idempotencyKey,
                'x-signature': signature,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payoutData),
        });
        
        const result = await response.json();
        
        if (response.ok && result.code === '00') {
            return {
                success: true,
                data: result.data,
            };
        }
        
        return {
            success: false,
            error: result.desc,
            code: result.code,
        };
    } catch (error: any) {
        console.error('Create payout error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

**Usage:**
```typescript
// Example: Refund to customer
const result = await createPayout({
    referenceId: `refund_${orderId}`,
    amount: 50000,
    description: 'Hoan tien don hang',
    toBin: '970422', // MBBank
    toAccountNumber: '0987726236',
    category: ['refund'],
});

if (result.success) {
    console.log('Payout created:', result.data.id);
    console.log('Status:', result.data.approvalState);
}
```

---

### ⚠️ Important Notes

**1. Idempotency Key** 🔑
- PHẢI unique cho mỗi request
- Format: `payout_{timestamp}_{random}`
- Dùng để prevent duplicate payout nếu retry

**2. Signature Verification** 🔐
- PHẢI generate đúng signature
- Sort fields alphabetically
- Use CHECKSUM_KEY

**3. Payout Limits** 📊
- Check với PayOS về daily/monthly limits
- Minimum amount: Thường 10,000 VND
- Maximum amount: Depends on account tier

**4. Processing Time** ⏱️
- State ban đầu: `PROCESSING`
- Thời gian xử lý: 1-5 phút (inter-bank)
- Check status qua GET API

---

### 🔍 Use Cases

**1. Customer Refund**
```typescript
await createPayout({
    referenceId: `refund_order_${orderId}`,
    amount: refundAmount,
    description: 'Hoan tien',
    toBin: customer.bankBin,
    toAccountNumber: customer.bankAccount,
    category: ['refund'],
});
```

**2. Salary Payment**
```typescript
await createPayout({
    referenceId: `salary_${employeeId}_${month}`,
    amount: salaryAmount,
    description: 'Luong thang',
    toBin: employee.bankBin,
    toAccountNumber: employee.bankAccount,
    category: ['salary'],
});
```

**3. Supplier Payment**
```typescript
await createPayout({
    referenceId: `payment_${invoiceId}`,
    amount: invoiceAmount,
    description: 'Thanh toan HĐ',
    toBin: supplier.bankBin,
    toAccountNumber: supplier.bankAccount,
    category: ['payment'],
});
```

---

**Status**: ✅ **HOÀN TẤT** - Payout APIs documentation complete  
**Last Updated**: 2026-01-15  
**Phần đã nhận**: 6/6 ✅ (FULL)

---

## 📖 Phần 6: Lấy Thông Tin Số Dư Tài Khoản Chi

### GET /v1/balance

Lấy thông tin số dư tài khoản chi PayOS

**URL**: `https://api-merchant.payos.vn/v1/balance`

> [!IMPORTANT]
> **Check balance TRƯỚC khi tạo payout** để đảm bảo đủ tiền!

---

### 🔑 Authentication

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
```

---

### ✅ Response - Success (200)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "availableBalance": 10000000,
    "pendingBalance": 500000,
    "totalBalance": 10500000
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.availableBalance` | integer | Số dư khả dụng (VND) - Có thể dùng ngay |
| `data.pendingBalance` | integer | Số dư đang xử lý (VND) - Chưa dùng được |
| `data.totalBalance` | integer | Tổng số dư (VND) |

**Note**: `totalBalance = availableBalance + pendingBalance`

---

### ❌ Error Responses

| Code | Description |
|------|-------------|
| `PAYOUT_API_KEY_NOT_FOUND` | API key không tìm thấy |
| `PAYOUT_API_KEY_NOT_ACTIVE` | API key không active |
| `403 Forbidden` | Không có quyền |
| `429 Too Many Requests` | Rate limit exceeded |

---

### 💻 Implementation

```typescript
// lib/payos-payout.ts

export async function getPayoutBalance() {
    try {
        const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID!;
        const PAYOS_API_KEY = process.env.PAYOS_API_KEY!;
        
        const response = await fetch(
            'https://api-merchant.payos.vn/v1/balance',
            {
                headers: {
                    'x-client-id': PAYOS_CLIENT_ID,
                    'x-api-key': PAYOS_API_KEY,
                }
            }
        );
        
        const result = await response.json();
        
        if (response.ok && result.code === '00') {
            return {
                success: true,
                data: result.data,
            };
        }
        
        return {
            success: false,
            error: result.desc,
            code: result.code,
        };
    } catch (error: any) {
        console.error('Get balance error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

---

### 🔍 Usage Examples

**1. Check Balance Before Payout**
```typescript
async function canAffordPayout(amount: number): Promise<boolean> {
    const balance = await getPayoutBalance();
    
    if (!balance.success) {
        console.error('Failed to get balance');
        return false;
    }
    
    const available = balance.data.availableBalance;
    
    if (available < amount) {
        console.error(`Insufficient balance: need ${amount}, have ${available}`);
        return false;
    }
    
    return true;
}

// Usage
const payoutAmount = 1000000;
const canProceed = await canAffordPayout(payoutAmount);

if (canProceed) {
    await createPayout({...});
}
```

**2. Display Balance in Dashboard**
```typescript
async function displayBalanceInfo() {
    const balance = await getPayoutBalance();
    
    if (balance.success) {
        console.log(`
╔══════════════════════════════════╗
║      PayOS Account Balance       ║
╠══════════════════════════════════╣
║ Available: ${balance.data.availableBalance.toLocaleString()} VND
║ Pending:   ${balance.data.pendingBalance.toLocaleString()} VND
║ ────────────────────────────────
║ Total:     ${balance.data.totalBalance.toLocaleString()} VND
╚══════════════════════════════════╝
        `);
        
        return balance.data;
    }
    
    return null;
}
```

**3. Auto Top-up Alert**
```typescript
const MIN_BALANCE_THRESHOLD = 5000000; // 5M VND

async function checkAndAlertLowBalance() {
    const balance = await getPayoutBalance();
    
    if (balance.success) {
        const available = balance.data.availableBalance;
        
        if (available < MIN_BALANCE_THRESHOLD) {
            // Send alert
            await sendAlert({
                type: 'LOW_BALANCE',
                message: `PayOS balance low: ${available.toLocaleString()} VND`,
                threshold: MIN_BALANCE_THRESHOLD,
                current: available,
            });
            
            console.warn('⚠️ Low balance - please top up!');
            return false;
        }
        
        console.log('✅ Balance sufficient');
        return true;
    }
    
    return false;
}

// Run daily
setInterval(checkAndAlertLowBalance, 24 * 60 * 60 * 1000);
```

**4. Batch Payout Validation**
```typescript
async function validateBatchPayoutBalance(payouts: BatchPayoutItem[]) {
    // 1. Get balance
    const balance = await getPayoutBalance();
    
    if (!balance.success) {
        return { valid: false, reason: 'Failed to get balance' };
    }
    
    // 2. Calculate total needed
    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
    
    // 3. Estimate fee
    const estimate = await estimatePayoutCredit({
        referenceId: 'balance_check',
        payouts: payouts,
    });
    
    const totalCost = estimate.success 
        ? totalAmount + estimate.estimateCredit 
        : totalAmount;
    
    // 4. Check if sufficient
    const available = balance.data.availableBalance;
    
    if (available < totalCost) {
        return {
            valid: false,
            reason: 'Insufficient balance',
            required: totalCost,
            available: available,
            shortfall: totalCost - available,
        };
    }
    
    return {
        valid: true,
        available: available,
        cost: totalCost,
        remaining: available - totalCost,
    };
}

// Usage
const validation = await validateBatchPayoutBalance(salaryPayouts);

if (!validation.valid) {
    console.error(`Cannot proceed: ${validation.reason}`);
    console.error(`Need to top up: ${validation.shortfall.toLocaleString()} VND`);
} else {
    console.log(`After payout, remaining: ${validation.remaining.toLocaleString()} VND`);
    await createBatchPayout({...});
}
```

**5. Cache Balance**
```typescript
let balanceCache: {
    data: any;
    timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedBalance(forceRefresh = false) {
    if (!forceRefresh && balanceCache && Date.now() - balanceCache.timestamp < CACHE_TTL) {
        console.log('Using cached balance');
        return balanceCache.data;
    }
    
    const balance = await getPayoutBalance();
    
    if (balance.success) {
        balanceCache = {
            data: balance,
            timestamp: Date.now(),
        };
    }
    
    return balance;
}

// Usage
const balance = await getCachedBalance(); // Use cache if fresh
const freshBalance = await getCachedBalance(true); // Force refresh
```

---

### 🎯 Use Cases

**1. Pre-flight Check**
```typescript
async function preFlightCheckPayout(amount: number) {
    const checks = [];
    
    // Check 1: Balance
    const balance = await getPayoutBalance();
    checks.push({
        name: 'Balance Check',
        passed: balance.success && balance.data.availableBalance >= amount,
        message: balance.success 
            ? `Available: ${balance.data.availableBalance.toLocaleString()} VND`
            : 'Failed to get balance',
    });
    
    // Check 2: API Key
    checks.push({
        name: 'API Key Check',
        passed: !!process.env.PAYOS_API_KEY,
        message: process.env.PAYOS_API_KEY ? 'API key configured' : 'API key missing',
    });
    
    const allPassed = checks.every(c => c.passed);
    
    return { allPassed, checks };
}
```

**2. Financial Dashboard**
```typescript
async function getDashboardStats() {
    const [balance, recentPayouts] = await Promise.all([
        getPayoutBalance(),
        getPayouts({ limit: 10, approvalState: 'SUCCEEDED' }),
    ]);
    
    if (!balance.success || !recentPayouts.success) {
        return null;
    }
    
    const totalPaidToday = recentPayouts.payouts
        .filter(p => isToday(new Date(p.createdAt)))
        .reduce((sum, p) => sum + p.transactions.reduce((s, t) => s + t.amount, 0), 0);
    
    return {
        currentBalance: balance.data.availableBalance,
        pendingBalance: balance.data.pendingBalance,
        paidToday: totalPaidToday,
        recentPayouts: recentPayouts.payouts.length,
    };
}
```

**3. Budget Planning**
```typescript
async function canAffordMonthlyPayroll(salaryList: number[]) {
    const totalSalary = salaryList.reduce((sum, s) => sum + s, 0);
    
    // Estimate fee
    const estimate = await estimatePayoutCredit({
        referenceId: 'payroll_estimate',
        payouts: salaryList.map((amount, idx) => ({
            referenceId: `emp_${idx}`,
            amount,
            description: 'Salary',
            toBin: '970422',
            toAccountNumber: '000000000',
        })),
    });
    
    const totalCost = estimate.success 
        ? totalSalary + estimate.estimateCredit 
        : totalSalary;
    
    // Check balance
    const balance = await getPayoutBalance();
    
    if (!balance.success) {
        return { canAfford: false, reason: 'Failed to get balance' };
    }
    
    return {
        canAfford: balance.data.availableBalance >= totalCost,
        balance: balance.data.availableBalance,
        required: totalCost,
        shortfall: Math.max(0, totalCost - balance.data.availableBalance),
    };
}
```

---

### ⚠️ Important Notes

**1. Real-time Balance** ⏱️
- Balance cập nhật real-time
- Sau mỗi payout thành công → balance giảm
- Sau topup → balance tăng

**2. Pending Balance** 🔄
- Payouts đang PROCESSING → pending
- Sau khi SUCCEEDED/FAILED → pending about available

**3. Rate Limiting** 🚦
- Không nên call quá nhiều (max ~100/min)
- Cache kết quả 5-10 phút
- Chỉ refresh khi cần thiết

**4. Balance vs Credit** 💰
```
Available Balance = Tiền có thể dùng ngay
Credit (từ estimate) = Phí giao dịch
Total Cost = Payout Amount + Credit
```

---

### 🎯 Best Practices

**1. Always Check Before Payout**
```typescript
// ✅ Good practice
const balance = await getPayoutBalance();
if (balance.success && balance.data.availableBalance >= totalCost) {
    await createPayout({...});
} else {
    alert('Insufficient balance');
}

// ❌ Bad practice - không check balance
await createPayout({...}); // Có thể fail vì hết tiền
```

**2. Monitor Balance Regularly**
```typescript
// Cron job - check balance mỗi giờ
cron.schedule('0 * * * *', async () => {
    await checkAndAlertLowBalance();
});
```

**3. Handle Errors Gracefully**
```typescript
const balance = await getPayoutBalance();

if (!balance.success) {
    if (balance.code === 'PAYOUT_API_KEY_NOT_ACTIVE') {
        console.error('PayOS API key not active - contact support');
    } else if (balance.code === '429') {
        console.error('Rate limited - retry after 1 minute');
        await sleep(60000);
        return await getPayoutBalance();
    } else {
        console.error('Failed to get balance:', balance.error);
    }
}
```

---


## 📖 Phần 5: Ước Tính Chi Phí

### POST /v1/payouts/estimate-credit

Ước tính phí (credit) cho lệnh chi trước khi tạo thật

**URL**: `https://api-merchant.payos.vn/v1/payouts/estimate-credit`

> [!TIP]
> **Call API này TRƯỚC khi create payout** để biết chính xác phí và tổng chi phí.

---

### 📤 Request Headers

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
x-signature: <computed_signature>
Content-Type: application/json
```

> [!NOTE]
> **Không cần** `x-idempotency-key` cho estimate API (vì không tạo gì thật)

---

### 📋 Request Body Schema

**Giống hệt batch payout request:**

```json
{
  "referenceId": "batch_payout_123",
  "category": ["salary", "bonus"],
  "validateDestination": true,
  "payouts": [
    {
      "referenceId": "payout_1",
      "amount": 100000,
      "description": "Thanh toan luong thang 1",
      "toBin": "970415",
      "toAccountNumber": "123456789"
    },
    {
      "referenceId": "payout_2",
      "amount": 50000,
      "description": "Thanh toan thuong",
      "toBin": "970422",
      "toAccountNumber": "987654321"
    }
  ]
}
```

---

### ✅ Response - Success (200)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "estimateCredit": 5000
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.estimateCredit` | integer | Ước tính phí (VND) |

**Calculation:**
```
Total Cost = Sum of payout amounts + estimateCredit
```

---

### 💻 Implementation

```typescript
// lib/payos-payout.ts

interface EstimateCreditData {
    referenceId: string;
    category?: string[];
    validateDestination?: boolean;
    payouts: BatchPayoutItem[];
}

export async function estimatePayoutCredit(data: EstimateCreditData) {
    try {
        const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID!;
        const PAYOS_API_KEY = process.env.PAYOS_API_KEY!;
        const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY!;
        
        // Generate signature (same as batch payout)
        const dataString = `referenceId=${data.referenceId}&validateDestination=${data.validateDestination || false}`;
        
        const signature = crypto
            .createHmac('sha256', CHECKSUM_KEY)
            .update(dataString)
            .digest('hex');
        
        const response = await fetch('https://api-merchant.payos.vn/v1/payouts/estimate-credit', {
            method: 'POST',
            headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
                'x-signature': signature,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (response.ok && result.code === '00') {
            return {
                success: true,
                estimateCredit: result.data.estimateCredit,
            };
        }
        
        return {
            success: false,
            error: result.desc,
            code: result.code,
        };
    } catch (error: any) {
        console.error('Estimate credit error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

---

### 🔍 Usage Examples

**1. Check Fee Before Creating Payout**
```typescript
const payoutData = {
    referenceId: 'salary_batch_202401',
    category: ['salary'],
    validateDestination: true,
    payouts: employees.map(emp => ({
        referenceId: `salary_${emp.id}`,
        amount: emp.salary,
        description: 'Luong thang 01',
        toBin: emp.bankBin,
        toAccountNumber: emp.bankAccount,
    })),
};

// 1. Estimate first
const estimate = await estimatePayoutCredit(payoutData);

if (estimate.success) {
    const totalAmount = payoutData.payouts.reduce((sum, p) => sum + p.amount, 0);
    const fee = estimate.estimateCredit;
    const totalCost = totalAmount + fee;
    
    console.log(`Total payout amount: ${totalAmount.toLocaleString()} VND`);
    console.log(`Estimated fee: ${fee.toLocaleString()} VND`);
    console.log(`Total cost: ${totalCost.toLocaleString()} VND`);
    
    // 2. Confirm with user before proceeding
    const confirmed = await confirmWithUser({
        totalAmount,
        fee,
        totalCost,
    });
    
    if (confirmed) {
        // 3. Create actual payout
        const result = await createBatchPayout(payoutData);
    }
}
```

**2. Display Fee to User**
```typescript
async function showPayoutCostEstimate(payouts: BatchPayoutItem[]) {
    const estimate = await estimatePayoutCredit({
        referenceId: `temp_${Date.now()}`, // Temporary ID for estimate
        payouts: payouts,
    });
    
    if (estimate.success) {
        const totalPayout = payouts.reduce((sum, p) => sum + p.amount, 0);
        
        return {
            payoutAmount: totalPayout,
            fee: estimate.estimateCredit,
            totalCost: totalPayout + estimate.estimateCredit,
            feePercentage: (estimate.estimateCredit / totalPayout * 100).toFixed(2),
        };
    }
    
    return null;
}

// Usage in UI
const cost = await showPayoutCostEstimate(payouts);
if (cost) {
    console.log(`
        Chi trả: ${cost.payoutAmount.toLocaleString()} VND
        Phí giao dịch: ${cost.fee.toLocaleString()} VND (${cost.feePercentage}%)
        ────────────────────────────
        Tổng cộng: ${cost.totalCost.toLocaleString()} VND
    `);
}
```

**3. Budget Validation**
```typescript
async function validateBudget(payouts: BatchPayoutItem[], budget: number) {
    const estimate = await estimatePayoutCredit({
        referenceId: 'budget_check',
        payouts: payouts,
    });
    
    if (!estimate.success) {
        return { valid: false, reason: 'Failed to estimate' };
    }
    
    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
    const totalCost = totalAmount + estimate.estimateCredit;
    
    if (totalCost > budget) {
        return {
            valid: false,
            reason: 'Insufficient budget',
            required: totalCost,
            available: budget,
            shortfall: totalCost - budget,
        };
    }
    
    return { valid: true, cost: totalCost };
}

// Usage
const budgetCheck = await validateBudget(salaryPayouts, 10000000);
if (!budgetCheck.valid) {
    console.error(`Budget insufficient: need ${budgetCheck.shortfall} VND more`);
}
```

**4. Bulk Estimate for Multiple Batches**
```typescript
async function estimateAllBatches(batches: BatchPayoutItem[][]) {
    const estimates = await Promise.all(
        batches.map((payouts, idx) => 
            estimatePayoutCredit({
                referenceId: `batch_${idx}_estimate`,
                payouts: payouts,
            })
        )
    );
    
    const totalFee = estimates.reduce((sum, est) => 
        est.success ? sum + est.estimateCredit : sum, 0
    );
    
    const totalPayout = batches.flat().reduce((sum, p) => sum + p.amount, 0);
    
    return {
        totalPayout,
        totalFee,
        grandTotal: totalPayout + totalFee,
        batches: estimates.length,
    };
}
```

---

### ⚠️ Important Notes

**1. Estimate ≠ Actual Fee** 📊
- Estimate là **gần đúng**
- Actual fee có thể khác một chút
- Always check final fee sau khi payout hoàn thành

**2. No Idempotency Key**
```typescript
// ❌ Don't include idempotency-key for estimate
headers: {
    'x-idempotency-key': '...', // NOT needed
}

// ✅ Only signature
headers: {
    'x-signature': signature,
}
```

**3. Use for Planning** 📋
- Budget planning
- Cost calculation
- User confirmation
- **NOT for actual payout creation**

**4. validateDestination Flag** 🔍
```typescript
validateDestination: true // May affect fee calculation
```
- Validation có thể có phí riêng
- Include nếu bạn sẽ dùng validate khi create thật

---

### 🎯 Best Practices

**1. Always Estimate First**
```typescript
// Best practice workflow
async function createPayoutWithConfirmation(payoutData: BatchPayoutData) {
    // Step 1: Estimate
    const estimate = await estimatePayoutCredit(payoutData);
    
    if (!estimate.success) {
        throw new Error('Failed to estimate');
    }
    
    // Step 2: Display cost to user
    const confirmed = await userConfirm({
        message: `Total cost: ${estimate.estimateCredit + totalAmount} VND`,
    });
    
    if (!confirmed) {
        return { cancelled: true };
    }
    
    // Step 3: Create payout
    return await createBatchPayout(payoutData);
}
```

**2. Cache Estimates**
```typescript
// Cache for similar payouts
const estimateCache = new Map();

async function getCachedEstimate(payouts: BatchPayoutItem[]) {
    const key = JSON.stringify(payouts.map(p => ({ amount: p.amount, toBin: p.toBin })));
    
    if (estimateCache.has(key)) {
        return estimateCache.get(key);
    }
    
    const estimate = await estimatePayoutCredit({
        referenceId: 'cache_estimate',
        payouts: payouts,
    });
    
    estimateCache.set(key, estimate);
    return estimate;
}
```

**3. Error Handling**
```typescript
const estimate = await estimatePayoutCredit(data);

if (!estimate.success) {
    if (estimate.code === 'SUBSCRIPTION_NOT_FOUND') {
        console.error('PayOS subscription not active');
    } else if (estimate.code === 'PAYMENT_REQUEST_DATA_SIGNATURE_INCORRECT') {
        console.error('Signature invalid - check checksum key');
    } else {
        console.error('Estimate failed:', estimate.error);
    }
}
```

---

## 🎉 Payout APIs Documentation Complete!

**Tổng số APIs**: 6/6 ✅ (FULL)

1. ✅ **Create Payout** - POST `/v1/payouts`
2. ✅ **Get Payouts List** - GET `/v1/payouts`
3. ✅ **Create Batch Payout** - POST `/v1/payouts/batch`
4. ✅ **Get Payout Info** - GET `/v1/payouts/{payoutId}`
5. ✅ **Estimate Credit** - POST `/v1/payouts/estimate-credit`
6. ✅ **Get Balance** - GET `/v1/balance`

---

## 📖 Quick Reference

### When to Use Each API

| API | Use Case | Frequency |
|-----|----------|-----------|
| Create Payout | Single refund, one-off payment | As needed |
| Get List | Reconciliation, reporting, dashboard | Daily/hourly |
| Batch Payout | Salary, bulk refunds, mass payments | Monthly/weekly |
| Get Info | Status check, tracking | After create |
| Estimate | Budget planning, user confirmation | Before create |
| **Get Balance** | **Check funds, monitoring** | **Before payout** |

### Typical Workflow

```
1. Get Balance (check funds)
   ↓
2. Estimate Credit (calculate total cost)
   ↓
3. User Confirmation
   ↓
4. Create Payout/Batch
   ↓
5. Get Info (poll status)
   ↓
6. Get List (reconciliation)
```

---

**Note**: Payout APIs khác với Payment Links - đây là **chi tiền RA**, không phải thu tiền VÀO.

---


## 📖 Phần 4: Lấy Thông Tin Lệnh Chi

### GET /v1/payouts/{payoutId}

Lấy thông tin chi tiết của một lệnh chi cụ thể

**URL**: `https://api-merchant.payos.vn/v1/payouts/{payoutId}`

---

### 🔑 Authentication

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
```

---

### 📋 Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payoutId` | string | ✅ | ID của payout (từ PayOS, không phải referenceId) |

**Example**: `/v1/payouts/payout_123456789`

---

### ✅ Response - Success (200)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "id": "payout_123456789",
    "referenceId": "ref_123456789",
    "transactions": [
      {
        "id": "txn_123456789",
        "referenceId": "ref_123456789",
        "amount": 100000,
        "description": "Thanh toan",
        "toBin": "970422",
        "toAccountNumber": "123456789",
        "toAccountName": "NGUYEN VAN A",
        "state": "PROCESSING"
      }
    ],
    "category": ["salary"],
    "approvalState": "PROCESSING",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Response Structure

Same as create payout response - có thể check real-time status.

---

### ❌ Error Responses

| Code | Description |
|------|-------------|
| `PAYOUT_BATCH_NOT_FOUND` | Payout không tìm thấy |
| `INVALID_PARAM` | payoutId không hợp lệ |
| `PAYOUT_API_KEY_NOT_FOUND` | API key không tìm thấy |
| `403 Forbidden` | Không có quyền |

---

### 💻 Implementation

```typescript
// lib/payos-payout.ts

export async function getPayoutInfo(payoutId: string) {
    try {
        const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID!;
        const PAYOS_API_KEY = process.env.PAYOS_API_KEY!;
        
        const response = await fetch(
            `https://api-merchant.payos.vn/v1/payouts/${payoutId}`,
            {
                headers: {
                    'x-client-id': PAYOS_CLIENT_ID,
                    'x-api-key': PAYOS_API_KEY,
                }
            }
        );
        
        const result = await response.json();
        
        if (response.ok && result.code === '00') {
            return {
                success: true,
                data: result.data,
            };
        }
        
        return {
            success: false,
            error: result.desc,
            code: result.code,
        };
    } catch (error: any) {
        console.error('Get payout info error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

---

### 🔍 Usage Examples

**1. Check Payout Status**
```typescript
const result = await getPayoutInfo('payout_123456789');

if (result.success) {
    console.log('Payout status:', result.data.approvalState);
    
    result.data.transactions.forEach(txn => {
        console.log(`Transaction ${txn.id}: ${txn.state}`);
    });
}
```

**2. Poll Until Completed**
```typescript
async function waitForPayoutCompletion(payoutId: string, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        const result = await getPayoutInfo(payoutId);
        
        if (!result.success) {
            console.error('Failed to get payout info');
            return null;
        }
        
        const status = result.data.approvalState;
        
        if (status === 'SUCCEEDED') {
            console.log('✅ Payout completed successfully');
            return result.data;
        }
        
        if (status === 'FAILED') {
            console.error('❌ Payout failed');
            return result.data;
        }
        
        // Still PROCESSING, wait and retry
        console.log(`⏳ Payout still processing... (${i + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10s
    }
    
    console.warn('⚠️ Timeout waiting for payout completion');
    return null;
}

// Usage
const finalStatus = await waitForPayoutCompletion('payout_123');
```

**3. Update Database After Completion**
```typescript
async function checkAndUpdatePayout(payoutId: string) {
    const result = await getPayoutInfo(payoutId);
    
    if (result.success) {
        // Update in database
        await db.payouts.update({
            where: { payoutId },
            data: {
                status: result.data.approvalState,
                updatedAt: new Date(),
            }
        });
        
        // Handle specific states
        if (result.data.approvalState === 'SUCCEEDED') {
            // Send notification, update accounting, etc.
            await onPayoutSuccess(result.data);
        } else if (result.data.approvalState === 'FAILED') {
            // Handle failure, retry logic, etc.
            await onPayoutFailure(result.data);
        }
    }
}
```

**4. Batch Status Check**
```typescript
async function checkMultiplePayouts(payoutIds: string[]) {
    const results = await Promise.all(
        payoutIds.map(id => getPayoutInfo(id))
    );
    
    const summary = {
        succeeded: 0,
        failed: 0,
        processing: 0,
    };
    
    results.forEach(result => {
        if (result.success) {
            const state = result.data.approvalState;
            if (state === 'SUCCEEDED') summary.succeeded++;
            else if (state === 'FAILED') summary.failed++;
            else if (state === 'PROCESSING') summary.processing++;
        }
    });
    
    console.log('Payout summary:', summary);
    return summary;
}
```

---

### 🎯 Use Cases

**1. Real-time Status Monitoring**
- Check status sau khi create
- Display progress bar cho user
- Update UI khi hoàn thành

**2. Reconciliation**
- Daily check tất cả payouts
- Match với bank statements
- Identify discrepancies

**3. Retry Failed Payouts**
```typescript
const result = await getPayoutInfo(payoutId);

if (result.success && result.data.approvalState === 'FAILED') {
    // Get original payout data from database
    const originalData = await db.payouts.findOne({ payoutId });
    
    // Retry with new payout
    const retryResult = await createPayout({
        referenceId: `${originalData.referenceId}_retry`,
        amount: originalData.amount,
        description: originalData.description,
        toBin: originalData.toBin,
        toAccountNumber: originalData.toAccountNumber,
    });
}
```

---

### ⚠️ Important Notes

**1. Use Payout ID, not Reference ID**
```typescript
// ❌ Wrong - using reference
await getPayoutInfo('ref_123456789');

// ✅ Correct - using payout ID
await getPayoutInfo('payout_123456789');
```

**2. Polling Best Practices**
- Don't poll too frequently (min 5-10s interval)
- Set max attempts to avoid infinite loop
- Use exponential backoff nếu có nhiều requests

**3. Cache Results**
```typescript
const cache = new Map();

async function getCachedPayoutInfo(payoutId: string, ttl = 60000) {
    const cached = cache.get(payoutId);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
    }
    
    const result = await getPayoutInfo(payoutId);
    
    if (result.success) {
        cache.set(payoutId, {
            data: result,
            timestamp: Date.now(),
        });
    }
    
    return result;
}
```

---


## 📖 Phần 3: Tạo Lệnh Chi Hàng Loạt

### POST /v1/payouts/batch

Tạo lô lệnh chi hàng loạt (multiple payouts in one request)

**URL**: `https://api-merchant.payos.vn/v1/payouts/batch`

> [!TIP]
> **Use batch API** khi cần tạo nhiều payouts cùng lúc (salary, refunds, etc.)  
> Hiệu quả hơn là call create payout nhiều lần.

---

### 📤 Request Headers

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
x-idempotency-key: batch_payout_1737012345_abc123
x-signature: <computed_signature>
Content-Type: application/json
```

---

### 📋 Request Body Schema

```json
{
  "referenceId": "batch_payout_123",
  "category": ["salary", "bonus"],
  "validateDestination": true,
  "payouts": [
    {
      "referenceId": "payout_1",
      "amount": 100000,
      "description": "Thanh toan luong thang 1",
      "toBin": "970415",
      "toAccountNumber": "123456789"
    },
    {
      "referenceId": "payout_2",
      "amount": 50000,
      "description": "Thanh toan thuong",
      "toBin": "970422",
      "toAccountNumber": "987654321"
    }
  ]
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `referenceId` | string | ✅ | Mã tham chiếu batch (unique) |
| `category` | Array<string> | ❌ | Danh mục chung cho tất cả payouts |
| `validateDestination` | boolean | ❌ | Validate tài khoản đích trước khi tạo |
| `payouts` | Array<PayoutItem> | ✅ | Danh sách payouts |

### PayoutItem Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `referenceId` | string | ✅ | Mã tham chiếu payout (unique trong batch) |
| `amount` | integer | ✅ | Số tiền VND |
| `description` | string | ✅ | Mô tả |
| `toBin` | string | ✅ | Mã ngân hàng đích |
| `toAccountNumber` | string | ✅ | Số tài khoản đích |

---

### 🔐 Signature Generation (Batch)

**For batch**, signature tính trên **batch data**, không phải từng payout riêng lẻ.

**Data to sign:**
```
referenceId=$referenceId&validateDestination=$validateDestination
```

**Example:**
```typescript
function generateBatchPayoutSignature(batchData: {
    referenceId: string;
    validateDestination?: boolean;
}) {
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY!;
    
    const dataString = `referenceId=${batchData.referenceId}&validateDestination=${batchData.validateDestination || false}`;
    
    const signature = crypto
        .createHmac('sha256', checksumKey)
        .update(dataString)
        .digest('hex');
    
    return signature;
}
```

---

### ✅ Response - Success (200)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "id": "batch_payout_123456789",
    "referenceId": "batch_ref_123456789",
    "transactions": [
      {
        "id": "txn_123",
        "referenceId": "payout_1",
        "amount": 100000,
        "description": "Thanh toan luong thang 1",
        "toBin": "970415",
        "toAccountNumber": "123456789",
        "toAccountName": "NGUYEN VAN A",
        "state": "PROCESSING"
      },
      {
        "id": "txn_124",
        "referenceId": "payout_2",
        "amount": 50000,
        "description": "Thanh toan thuong",
        "toBin": "970422",
        "toAccountNumber": "987654321",
        "toAccountName": "TRAN THI B",
        "state": "PROCESSING"
      }
    ],
    "category": ["salary", "bonus"],
    "approvalState": "PROCESSING",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response structure tương tự single payout**, nhưng `transactions` array có nhiều items.

---

### 💻 Implementation

```typescript
// lib/payos-payout.ts

interface BatchPayoutItem {
    referenceId: string;
    amount: number;
    description: string;
    toBin: string;
    toAccountNumber: string;
}

interface BatchPayoutData {
    referenceId: string;
    category?: string[];
    validateDestination?: boolean;
    payouts: BatchPayoutItem[];
}

export async function createBatchPayout(batchData: BatchPayoutData) {
    try {
        const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID!;
        const PAYOS_API_KEY = process.env.PAYOS_API_KEY!;
        const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY!;
        
        // Generate idempotency key
        const idempotencyKey = `batch_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Generate signature for batch
        const dataString = `referenceId=${batchData.referenceId}&validateDestination=${batchData.validateDestination || false}`;
        
        const signature = crypto
            .createHmac('sha256', CHECKSUM_KEY)
            .update(dataString)
            .digest('hex');
        
        // Make API call
        const response = await fetch('https://api-merchant.payos.vn/v1/payouts/batch', {
            method: 'POST',
            headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
                'x-idempotency-key': idempotencyKey,
                'x-signature': signature,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(batchData),
        });
        
        const result = await response.json();
        
        if (response.ok && result.code === '00') {
            return {
                success: true,
                data: result.data,
            };
        }
        
        return {
            success: false,
            error: result.desc,
            code: result.code,
        };
    } catch (error: any) {
        console.error('Create batch payout error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

---

### 🔍 Usage Examples

**1. Monthly Salary Payment**
```typescript
// Get all employees' bank info from database
const employees = await db.employees.findAll();

const payouts = employees.map(emp => ({
    referenceId: `salary_${emp.id}_202401`,
    amount: emp.salary,
    description: `Luong thang 01/2024`,
    toBin: emp.bankBin,
    toAccountNumber: emp.bankAccount,
}));

const result = await createBatchPayout({
    referenceId: `salary_batch_202401`,
    category: ['salary'],
    validateDestination: true, // ✅ Validate trước
    payouts: payouts,
});

if (result.success) {
    console.log(`Created batch payout with ${result.data.transactions.length} items`);
}
```

**2. Bulk Refunds**
```typescript
const refundOrders = await db.orders.findAll({
    where: { status: 'refund_approved' }
});

const refunds = refundOrders.map(order => ({
    referenceId: `refund_${order.id}`,
    amount: order.refundAmount,
    description: `Hoan tien DH ${order.id}`,
    toBin: order.customerBankBin,
    toAccountNumber: order.customerBankAccount,
}));

const result = await createBatchPayout({
    referenceId: `refund_batch_${Date.now()}`,
    category: ['refund'],
    validateDestination: false,
    payouts: refunds,
});
```

**3. Partner Payouts**
```typescript
const partners = [
    { id: 'partner_1', amount: 500000, bin: '970415', account: '111222333' },
    { id: 'partner_2', amount: 300000, bin: '970422', account: '444555666' },
];

const result = await createBatchPayout({
    referenceId: `partner_payout_${new Date().toISOString().split('T')[0]}`,
    category: ['partnership', 'commission'],
    validateDestination: true,
    payouts: partners.map(p => ({
        referenceId: `partner_payout_${p.id}`,
        amount: p.amount,
        description: 'Hoa hong doi tac',
        toBin: p.bin,
        toAccountNumber: p.account,
    })),
});
```

---

### ⚠️ Important Notes

**1. validateDestination Flag** 🔍
```typescript
validateDestination: true  // ✅ Recommended
```
- PayOS sẽ verify tài khoản đích trước khi create
- Giảm risk chuyển sai account
- Có thể slow hơn một chút

**2. Batch Size Limits** 📊
- Max payouts per batch: Check với PayOS (thường ~100-200)
- Nếu có nhiều hơn → split thành multiple batches

```typescript
// Split large batch
const BATCH_SIZE = 100;
const batches = [];

for (let i = 0; i < allPayouts.length; i += BATCH_SIZE) {
    const chunk = allPayouts.slice(i, i + BATCH_SIZE);
    batches.push(chunk);
}

for (const batch of batches) {
    await createBatchPayout({
        referenceId: `batch_${Date.now()}`,
        payouts: batch,
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
}
```

**3. Idempotency** 🔑
- Mỗi batch cần unique idempotency key
- Nếu retry → toàn bộ batch retry, không phải từng payout

**4. Approval State** 📌
- `approvalState` là status của TOÀN BỘ batch
- Individual transactions có `state` riêng
- Batch có thể SUCCEEDED nhưng 1 vài transactions FAILED

---

### 🎯 Best Practices

**1. Validate Before Creating**
```typescript
// Validate all payouts first
const validPayouts = payouts.filter(p => {
    return p.amount > 0 && p.toAccountNumber && p.toBin;
});

await createBatchPayout({
    validateDestination: true,
    payouts: validPayouts,
});
```

**2. Track Individual Statuses**
```typescript
const result = await createBatchPayout({...});

if (result.success) {
    // Check each transaction
    result.data.transactions.forEach(txn => {
        console.log(`${txn.referenceId}: ${txn.state}`);
        
        if (txn.state === 'FAILED') {
            // Handle failed transaction
            console.error(`Failed: ${txn.referenceId}`);
        }
    });
}
```

**3. Store Batch Reference**
```typescript
// Save to database for tracking
await db.payoutBatches.create({
    batchId: result.data.id,
    referenceId: batchData.referenceId,
    totalPayouts: payouts.length,
    totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
    status: result.data.approvalState,
    createdAt: new Date(),
});
```

---


## 📖 Phần 2: Lấy Danh Sách Lệnh Chi

### GET /v1/payouts

Lấy danh sách các lệnh chi với pagination và filters

**URL**: `https://api-merchant.payos.vn/v1/payouts`

---

### 🔑 Authentication

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
```

---

### 📋 Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Số lượng kết quả mỗi trang (max: 100) |
| `offset` | integer | 0 | Vị trí bắt đầu (for pagination) |
| `referenceId` | string | - | Filter theo reference ID |
| `approvalState` | string | - | Filter theo trạng thái (SUCCEEDED, PROCESSING, FAILED) |
| `category` | string | - | Filter theo category (comma-separated) |
| `fromDate` | string | - | Từ ngày (ISO 8601 format) |
| `toDate` | string | - | Đến ngày (ISO 8601 format) |

**Example Query:**
```
GET /v1/payouts?limit=20&offset=0&approvalState=SUCCEEDED&category=salary,bonus
```

---

### ✅ Response - Success (200)

**Response Headers:**
```
x-signature: <response_signature>
```

**Response Body:**
```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "payouts": [
      {
        "id": "payout_123456789",
        "referenceId": "ref_123456789",
        "transactions": [
          {
            "id": "txn_123456789",
            "referenceId": "ref_123456789",
            "amount": 100000,
            "description": "Thanh toan",
            "toBin": "970422",
            "toAccountNumber": "123456789",
            "toAccountName": "NGUYEN VAN A",
            "state": "SUCCEEDED"
          }
        ],
        "category": ["salary"],
        "approvalState": "SUCCEEDED",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 10,
      "offset": 0,
      "count": 1,
      "hasMore": false
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.payouts` | array | Danh sách payouts |
| `data.pagination.total` | integer | Tổng số payouts |
| `data.pagination.limit` | integer | Limit của request |
| `data.pagination.offset` | integer | Offset của request |
| `data.pagination.count` | integer | Số lượng trong response |
| `data.pagination.hasMore` | boolean | Còn data tiếp theo? |

---

### ❌ Error Responses

| Code | Description |
|------|-------------|
| `INVALID_PARAM` | Tham số không hợp lệ |
| `PAYOUT_API_KEY_NOT_FOUND` | API key không tìm thấy |
| `PAYOUT_API_KEY_NOT_ACTIVE` | API key không active |
| `403 Forbidden` | Không có quyền truy cập |
| `429 Too Many Requests` | Rate limit exceeded |

---

### 💻 Implementation

```typescript
// lib/payos-payout.ts

interface GetPayoutsParams {
    limit?: number;
    offset?: number;
    referenceId?: string;
    approvalState?: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
    category?: string[]; // Will be joined with comma
    fromDate?: string; // ISO 8601
    toDate?: string; // ISO 8601
}

export async function getPayouts(params: GetPayoutsParams = {}) {
    try {
        const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID!;
        const PAYOS_API_KEY = process.env.PAYOS_API_KEY!;
        
        // Build query string
        const queryParams = new URLSearchParams();
        
        if (params.limit) queryParams.set('limit', params.limit.toString());
        if (params.offset) queryParams.set('offset', params.offset.toString());
        if (params.referenceId) queryParams.set('referenceId', params.referenceId);
        if (params.approvalState) queryParams.set('approvalState', params.approvalState);
        if (params.category && params.category.length > 0) {
            queryParams.set('category', params.category.join(','));
        }
        if (params.fromDate) queryParams.set('fromDate', params.fromDate);
        if (params.toDate) queryParams.set('toDate', params.toDate);
        
        const queryString = queryParams.toString();
        const url = `https://api-merchant.payos.vn/v1/payouts${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.code === '00') {
            return {
                success: true,
                payouts: result.data.payouts,
                pagination: result.data.pagination,
            };
        }
        
        return {
            success: false,
            error: result.desc,
            code: result.code,
        };
    } catch (error: any) {
        console.error('Get payouts error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

---

### 🔍 Usage Examples

**1. Get all payouts (default pagination)**
```typescript
const result = await getPayouts();

if (result.success) {
    console.log('Total payouts:', result.pagination.total);
    result.payouts.forEach(payout => {
        console.log(`Payout ${payout.id}: ${payout.approvalState}`);
    });
}
```

**2. Get succeeded payouts only**
```typescript
const result = await getPayouts({
    approvalState: 'SUCCEEDED',
    limit: 50,
});
```

**3. Get salary payouts in date range**
```typescript
const result = await getPayouts({
    category: ['salary'],
    fromDate: '2024-01-01T00:00:00Z',
    toDate: '2024-01-31T23:59:59Z',
    limit: 100,
});
```

**4. Pagination loop**
```typescript
let offset = 0;
const limit = 20;
let hasMore = true;

while (hasMore) {
    const result = await getPayouts({ limit, offset });
    
    if (!result.success) break;
    
    // Process batch
    result.payouts.forEach(payout => {
        console.log(payout.id);
    });
    
    hasMore = result.pagination.hasMore;
    offset += limit;
}
```

**5. Search by reference ID**
```typescript
const result = await getPayouts({
    referenceId: 'refund_order_12345',
});

if (result.success && result.payouts.length > 0) {
    const payout = result.payouts[0];
    console.log('Payout status:', payout.approvalState);
}
```

---

### 📊 Approval States

| State | Description | Next Action |
|-------|-------------|-------------|
| `PROCESSING` | Đang xử lý | Wait or check status later |
| `SUCCEEDED` | Thành công | Payment completed |
| `FAILED` | Thất bại | Check error, retry if needed |

---

### 🎯 Best Practices

**1. Use Pagination**
```typescript
// Don't fetch all at once
const result = await getPayouts({ limit: 100 }); // ❌ Too many

// Use reasonable page size
const result = await getPayouts({ limit: 20 }); // ✅ Good
```

**2. Filter by Date Range**
```typescript
// Always use date filters for large datasets
const result = await getPayouts({
    fromDate: '2024-01-01T00:00:00Z',
    toDate: '2024-01-31T23:59:59Z',
});
```

**3. Cache Results**
```typescript
// Cache successful payouts to reduce API calls
const cacheKey = `payouts_${approvalState}_${offset}`;
const cached = cache.get(cacheKey);
if (cached) return cached;

const result = await getPayouts({ approvalState, offset });
cache.set(cacheKey, result, 300); // 5 min TTL
```

---

### ⚠️ Rate Limiting

**429 Too Many Requests** nếu vượt rate limit:
- Default: ~100 requests/minute
- Solution: Implement backoff retry
- Use pagination thay vì request toàn bộ

```typescript
async function getPayoutsWithRetry(params: GetPayoutsParams, retries = 3) {
    for (let i = 0; i < retries; i++) {
        const result = await getPayouts(params);
        
        if (result.success || result.code !== '429') {
            return result;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
    
    return { success: false, error: 'Rate limit exceeded' };
}
```

---

