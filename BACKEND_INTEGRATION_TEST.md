# Backend Integration Testing - Quick Start

## 🎯 Test the Real Supabase Connection

Now that queue is connected to Supabase, follow these tests:

---

## ✅ Test 1: Create Pin (2 min)

1. Run app: `npx expo run:ios`
2. Tap map to create new pin
3. Fill details, submit
4. **Watch logs**:
   ```
   [Supabase] Syncing pin: create abc123
   ✓ Completed: CREATE pin:abc123
   ```
5. **Verify Supabase**:
   - Open dashboard → Table Editor → `pins`
   - Your pin should appear!

---

## ✅ Test 2: Create Form (2 min)

1. Tap on a pin
2. Create form submission
3. Submit
4. **Watch logs**:
   ```
   [Supabase] Syncing form: create xyz789
   ✓ Completed: CREATE form:xyz789
   ```
5. **Verify Supabase**:
   - Dashboard → `forms` table
   - Form appears!

---

## ✅ Test 3: Offline Mode (5 min)

1. **Enable Airplane Mode** ✈️
2. Create 3 pins
3. Status bar shows: "Synced (3 queued)"
4. **Disable Airplane Mode**
5. Wait 10 seconds
6. Queue auto-processes
7. **Verify**: All 3 pins in Supabase!

---

## 🎉 Success Criteria

You'll know it works when:

- ✅ Logs say `[Supabase]` not `[Simulated]`
- ✅ Data in Supabase Dashboard
- ✅ Offline operations queue correctly
- ✅ No errors in console

---

## 📚 Full Docs

- `PHASE2_COMPLETE.md` - Complete backend integration docs
- `BACKEND_INTEGRATION_GUIDE.md` - Integration details
- `TESTING_GUIDE.md` - Comprehensive testing guide

**Ready? Run the app and create a pin!** 🚀
