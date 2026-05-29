# Security Specification: Cornerstone Savings & Loans

## 1. Data Invariants
- **Loans**:
  - `principal` must be a positive number.
  - `interestRate` must be between 0% and 100%.
  - `termMonths` must be between 1 and 360.
  - `startDate` must be a valid date format.
  - State boundaries: Status can only transition along: `active` -> `overdue` / `paid` / `defaulted`. Once status is `paid`, no further repayments can be posted (Terminal State Locking).
  - Mutability: `id`, `principal`, `interestRate`, `startDate`, and `termMonths` are immutable after creation on client updates. Only authenticated staff accounts can modify financial/structural fields.
- **Reminder Logs**:
  - `loanId` must reference a valid loan ID.
  - `channel` must be one of `sms`, `email`, or `push`.
  - `paymentAmount` must be a positive number or zero.
- **Staff Accounts**:
  - `email` must be a verified email format.
  - `createdAt` must be a timestamp or date string.

---

## 2. The "Dirty Dozen" Payloads (Exploit Payloads)

### Payload 1: Zero/Negative Principal Poisoning (Schema Violation)
An attacker attempts to create a loan with $0 or negative principal to generate corrupted schedules.
```json
{
  "id": "exploit-loan-1",
  "borrowerName": "Attacker",
  "principal": -5000,
  "interestRate": 5,
  "termMonths": 12,
  "interestType": "flat",
  "paymentFrequency": "monthly",
  "startDate": "2026-05-24",
  "status": "active"
}
```

### Payload 2: Ghost Field Injection (Shadow Update)
An attacker attempts to insert a custom role field (`isAdmin: true`) or custom bypass field into their profile/loan.
```json
{
  "id": "loan-1",
  "borrowerName": "Sarah Jenkins",
  "isAdmin": true
}
```

### Payload 3: Client Financial Mutability Bypass (Tiered Identity Violation)
A client tries to reduce their loan principal to $0.
```json
{
  "id": "loan-1",
  "principal": 0
}
```

### Payload 4: Invalid Status Shortcutting (State Transition Attack)
A client attempts to force-mark their loan status to `paid` without submitting actual repayments.
```json
{
  "id": "loan-1",
  "status": "paid"
}
```

### Payload 5: Date Poisoning / Future Back-dating (Integrity Violation)
An attacker attempts to set a startDate of year "1900" or a 1MB string.
```json
{
  "id": "exploit-loan-4",
  "startDate": "1900-01-01",
  "principal": 1000
}
```

### Payload 6: Infinite Interest Rate Hijack (Resource Exhaustion)
An attacker attempts to set an interest rate of 10,000,000% to cause divide-by-zero or calculation overflow crashes on the server/client.
```json
{
  "id": "exploit-loan-5",
  "interestRate": 10000000
}
```

### Payload 7: Denial of Wallet Document ID Poisoning (ID Infection)
An attacker tries to write to a document ID with a 1.5KB malicious string path to exhaust database index processing.
```json
{
  "malicious_id_with_huge_junk_unicode_characters_and_path_traversal": {...}
}
```

### Payload 8: Cross-Tenant Loan Hijacking (Identity Spoofing)
Client logged in as `loan-1` tries to read or edit `loan-2`'s profile details.
```json
{
  "id": "loan-2",
  "borrowerName": "Sarah Jenkins (Hijacked)"
}
```

### Payload 9: Orphaned Reminder Log Insertion (Relational Invariant Violation)
Attacker tries to insert a ReminderLog referring to a non-existent loan ID `fake-id-9990`.
```json
{
  "id": "log-fake",
  "loanId": "non-existent-id",
  "message": "Click and pay me money"
}
```

### Payload 10: Terminal State Repayment Sluicing (Settle Penalty Bypass)
Attacker posts a new repayment after the loan status has already been marked as terminal `paid` to trigger credit refunds.
```json
{
  "id": "rep-post-paid",
  "amountPaid": 10000,
  "notes": "Post closing refund request"
}
```

### Payload 11: Spoofed Staff Account Self-Elevation (Privilege Escalation)
An unauthenticated user attempts to write their raw UID directly to `/staffAccounts` to gain staff roles.
```json
{
  "id": "attacker-uid",
  "email": "attacker@gmail.com",
  "password": "pass",
  "createdAt": "2026-05-24"
}
```

### Payload 12: Invalid Channel Spamming (Spam Attack)
Attacker pushes a ReminderLog with channel set to `telepathy_beam` which exploits downstream microservices.
```json
{
  "id": "log-exploit",
  "channel": "telepathy_beam",
  "message": "Spam payload"
}
```

---

## 3. Test Runner Checklist (TDD Verification)

We will verify through our hardcoded Firestore rules that:
- Any write matching `loans/{loanId}` must invoke `isValidLoan(incoming)` on create/update.
- Unauthenticated list/get requests on `/loans` are strictly blocked unless filtering by specific client document ID, or the user is a logged-in authenticated staff member.
- Writing to `/staffAccounts` can only be performed by existing valid administrative accounts (which can be bootstrapped on first launch or set securely).
- Any attempt to modify immutable fields like `principal` or `interestRate` outside of Staff mode yields static `PERMISSION_DENIED`.
