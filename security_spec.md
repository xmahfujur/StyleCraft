# Security Specification - StyleCraft

## 1. Data Invariants
- A user can only access their own profile unless they are an admin.
- Anonymous users (guests) can have a profile without an email.
- Orders must be tied to the authenticated user who created them.
- Only admins can modify products, categories, and collections.
- Document IDs must follow strict format rules to prevent injection attacks.

## 2. The "Dirty Dozen" Payloads (Deny Test Cases)

### User Profiling
1. **Identity Spoofing**: Logged in as `userA`, trying to create a profile for `userB`.
   - Payload: `setDoc(doc(db, 'users', 'userB'), { uid: 'userB', ... })`
2. **Role Escalation**: Regular user trying to set their role to `admin`.
   - Payload: `setDoc(doc(db, 'users', 'userA'), { role: 'admin', ... })`
3. **Shadow Fields**: Adding `isVerified: true` to a profile update.
   - Payload: `updateDoc(doc(db, 'users', 'userA'), { isVerified: true })`
4. **Invalid Email**: Creating a profile with a non-string email.
   - Payload: `setDoc(doc(db, 'users', 'userA', { email: 123, ... })`

### Orders
5. **Orphaned Order**: Creating an order for another user.
   - Payload: `addDoc(collection(db, 'orders'), { userId: 'victimId', ... })`
6. **Price Manipulation**: Creating an order with total `0` for items that cost more. (Logic should check price, but rules should at least check for positive number).
7. **Status Hijacking**: User trying to mark their own order as `Delivered`.
   - Payload: `updateDoc(doc(db, 'orders', 'orderId'), { status: 'Delivered' })`

### Product Catalog
8. **Unauthorized Product Edit**: Regular user trying to change product price.
9. **Toxic ID Injection**: Creating a product with a 2MB string as ID.

### PII Protection
10. **Global User Scrape**: Trying to list all users as a regular user.
    - Payload: `getDocs(collection(db, 'users'))`
11. **Guest Email Injection**: Adding an email to a guest profile during creation without being a verified user? (Actually guests don't have emails, but they shouldn't be able to set someone else's).

### System Integrity
12. **Recursive Cost Attack**: Triggering too many `get()` calls via complex rule evaluation (Guarded by 10-read limit, but prevented by optimized rules).

## 3. Test Runner (Draft Plan)
A `firestore.rules.test.ts` will be created to verify these denials.
