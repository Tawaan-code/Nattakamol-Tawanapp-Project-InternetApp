// ==========================================
// ส่วนที่ 1: นำเข้าเครื่องมือ (Imports)
// ==========================================
import * as ImagePicker from 'expo-image-picker'; // เครื่องมือสำหรับเปิดแกลอรี่เลือกรูปภาพ
import { useState } from 'react'; // React Hooks สำหรับจัดการความจำและวงจรชีวิตของแอป
import { Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"; // UI Components ของ React Native

export default function App() {
  // ==========================================
  // ส่วนที่ 2: ระบบความจำของแอป (State Management)
  // State คือตัวแปรที่เมื่อค่าเปลี่ยน หน้าจอจะรีเฟรชตัวเองอัตโนมัติ
  // ==========================================
  
  // 2.1 State สำหรับระบบบัญชีผู้ใช้ (Authentication)
  const [loggedInUser, setLoggedInUser] = useState(null); // จำชื่อผู้ใช้ที่กำลังล็อกอิน (ถ้าเป็น null แปลว่ายังไม่ล็อกอิน)
  const [isRegistering, setIsRegistering] = useState(false); // จำว่าตอนนี้ผู้ใช้อยู่หน้า "เข้าสู่ระบบ" (false) หรือ "สมัครสมาชิก" (true)
  const [username, setUsername] = useState(''); // จำข้อความในช่องกรอก Username
  const [password, setPassword] = useState(''); // จำข้อความในช่องกรอก Password

  // 2.2 State สำหรับระบบเปลี่ยนรหัสผ่าน (Security)
  const [changePwdVisible, setChangePwdVisible] = useState(false); // ควบคุมการเปิด/ปิด หน้าต่างเปลี่ยนรหัสผ่าน
  const [oldPassword, setOldPassword] = useState(''); // จำรหัสผ่านเดิม
  const [newPassword, setNewPassword] = useState(''); // จำรหัสผ่านใหม่

  // 2.3 State สำหรับจัดการสินค้าและระบบค้นหา (Products & Search)
  const [products, setProducts] = useState([]); // จำข้อมูลสินค้าทั้งหมดที่ดึงมาจากฐานข้อมูล (เป็น Array)
  const [searchQuery, setSearchQuery] = useState(''); // จำข้อความที่ผู้ใช้พิมพ์ในช่องค้นหา
  
  // 2.4 State สำหรับหน้าต่างเพิ่ม/แก้ไขสินค้า (CRUD Modal)
  const [modalVisible, setModalVisible] = useState(false); // ควบคุมการเปิด/ปิด หน้าต่างเพิ่ม/แก้สินค้า
  const [isEditing, setIsEditing] = useState(false); // จำว่าตอนนี้เป็นการ "แก้ไข" (true) หรือ "เพิ่มใหม่" (false)
  const [editId, setEditId] = useState(null); // จำ ID ของสินค้าที่กำลังกดแก้ไข
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', detail: '', image: null }); // ก้อนข้อมูล (Object) ที่ผูกกับช่องกรอกในหน้าต่างเพิ่ม/แก้สินค้า

  // ==========================================
  // ส่วนที่ 3: ตั้งค่าการเชื่อมต่อเซิร์ฟเวอร์ (API Endpoints)
  // ==========================================
  const IP_SERVER = 'http://119.59.102.161:3015'; // IP และ Port ของ Backend (Node.js)

  // ฟังก์ชันช่วยเหลือสำหรับแสดง Pop-up แจ้งเตือน (รองรับทั้ง Web และ Mobile)
  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(title, msg);
  };

  // ==========================================
  // ส่วนที่ 4: ฟังก์ชันจัดการระบบหลังบ้าน (API Calls)
  // ==========================================

  // ฟังก์ชันสมัครสมาชิกและเข้าสู่ระบบ (รวมอยู่ในปุ่มเดียว)
  const handleAuth = async () => {
    if (!username || !password) return showAlert('Error', 'กรุณากรอกข้อมูลให้ครบถ้วน');
    
    // เช็คว่ากดปุ่มมาจากหน้าไหน (สมัคร หรือ ล็อกอิน) เพื่อเลือกยิง API ไปให้ถูกเส้นทาง
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    try {
      // ใช้ fetch ส่งข้อมูล (POST) ไปหา Backend
      const response = await fetch(`${IP_SERVER}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password: password.trim() }) // แปลงข้อมูลเป็น JSON
      });
      const data = await response.json(); // รอรับผลลัพธ์จาก Backend
      
      if (response.ok) {
        if (isRegistering) {
          showAlert('Success', 'สร้างบัญชีสำเร็จ! กรุณาเข้าสู่ระบบ');
          setIsRegistering(false); // สลับกลับไปหน้าล็อกอิน
          setPassword(''); // เคลียร์รหัสผ่านทิ้ง
        } else {
          setLoggedInUser(username.trim().toLowerCase()); // บันทึกสถานะว่าล็อกอินแล้ว
          loadProducts(); // ล็อกอินผ่านปุ๊บ สั่งดึงข้อมูลสินค้าทันที!
        }
      } else {
        showAlert('Error', data.error || 'เกิดข้อผิดพลาด'); // แจ้งเตือนถ้ารหัสผิดหรือไอดีซ้ำ
      }
    } catch (error) {
      showAlert('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  // ฟังก์ชันเปลี่ยนรหัสผ่าน
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return showAlert('Error', 'กรุณากรอกข้อมูลให้ครบ');
    try {
      const response = await fetch(`${IP_SERVER}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedInUser, oldPassword: oldPassword.trim(), newPassword: newPassword.trim() })
      });
      const result = await response.json();
      if (response.ok) {
        showAlert('Success', 'เปลี่ยนรหัสผ่านสำเร็จ!');
        setChangePwdVisible(false); // ปิดหน้าต่างเปลี่ยนรหัส
        setOldPassword(''); setNewPassword(''); // เคลียร์ฟอร์ม
      } else {
        showAlert('Error', result.error);
      }
    } catch (error) {
      showAlert('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  // ฟังก์ชัน (R) ดึงข้อมูลสินค้าทั้งหมดจาก Backend (ใช้ method GET)
  const loadProducts = async () => {
    try {
      const response = await fetch(`${IP_SERVER}/api/products`);
      setProducts(await response.json()); // เอาข้อมูล JSON ที่ได้มาใส่ใน State 'products' หน้าจอจะรีเฟรชโชว์ข้อมูลอัตโนมัติ
    } catch (error) { console.error(error); }
  };

  // ฟังก์ชันเลือกรูปภาพ (อธิบายอาจารย์: ตรงนี้คือจุดที่แปลงรูปเป็น Base64)
  const pickImage = async () => {
    // กรณีรันบนเว็บเบราว์เซอร์
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/jpeg, image/png';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader(); // เครื่องมืออ่านไฟล์
          // เมื่ออ่านเสร็จ ให้เอาผลลัพธ์ข้อความ Base64 (event.target.result) ไปเก็บใน State formData.image
          reader.onload = (event) => setFormData({ ...formData, image: event.target.result });
          reader.readAsDataURL(file); // สั่งให้แปลงไฟล์รูปเป็นข้อความ URL (Base64)
        }
      };
      input.click();
      return;
    }
    // กรณีรันเป็นแอพมือถือ
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setFormData(prev => ({ ...prev, image: result.assets[0].uri }));
  };

  // ฟังก์ชันเตรียมความพร้อมก่อนเปิดหน้าต่าง "เพิ่มสินค้าใหม่" (ล้างข้อมูลเก่าทิ้งให้หมด)
  const openAddModal = () => { setFormData({ name: '', price: '', stock: '', detail: '', image: null }); setIsEditing(false); setModalVisible(true); };
  
  // ฟังก์ชันเตรียมความพร้อมก่อนเปิดหน้าต่าง "แก้ไขสินค้า" (ดูดข้อมูลเดิมมาแปะใส่ฟอร์ม)
  const openEditModal = (item) => {
    setFormData({ 
      name: item.NAME || item.name || '', 
      price: item.price ? item.price.toString() : '', 
      stock: item.stock ? item.stock.toString() : '0', 
      detail: item.detail || '',
      image: item.image_url // รูปเก่าที่เคยบันทึกไว้
    });
    setEditId(item.id); // จำ ID ว่ากำลังแก้ตัวไหน
    setIsEditing(true); // เปลี่ยนสถานะเป็นโหมดแก้ไข
    setModalVisible(true); // เปิดหน้าต่าง
  };

  // ฟังก์ชัน (C / U) บันทึกข้อมูล (เป็นได้ทั้งเพิ่มใหม่ และแก้ไข)
  const handleSave = async () => {
    // จัดระเบียบข้อมูลก่อนส่ง
    const payload = { 
      name: formData.name ? formData.name.trim() : '', 
      price: parseInt(formData.price) || 0, 
      stock: parseInt(formData.stock) || 0, 
      detail: formData.detail ? formData.detail.trim() : '',
      image: formData.image // ข้อมูลรูป (Base64 หรือ Link)
    };
    if (!payload.name) return showAlert('Error', 'กรุณากรอกชื่อสินค้า');

    try {
      // เช็คว่าถ้า isEditing เป็น true ให้ยิงไปเส้นทางแก้ (ใส่ ID ต่อท้าย) ถ้า false ยิงไปเส้นทางสร้าง
      const url = isEditing ? `${IP_SERVER}/api/products/${editId}` : `${IP_SERVER}/api/products`;
      const method = isEditing ? 'PUT' : 'POST'; // แก้ไขใช้ PUT, สร้างใหม่ใช้ POST
      
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      
      setModalVisible(false); // ปิดหน้าต่างฟอร์ม
      loadProducts(); // สั่งดึงข้อมูลใหม่เพื่ออัปเดตหน้าจอทันที
    } catch (error) { console.error(error); }
  };

  // ฟังก์ชัน (D) ระบบลบสินค้า (เด้งถามความแน่ใจก่อนลบจริง)
  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('ยืนยันการลบสินค้านี้?')) executeDelete(id);
    } else {
      Alert.alert('ยืนยัน', 'ต้องการลบสินค้านี้ใช่หรือไม่?', [{ text: 'ยกเลิก', style: 'cancel' }, { text: 'ลบ', style: 'destructive', onPress: () => executeDelete(id) }]); 
    }
  };

  // ฟังก์ชันลบสินค้าจริงๆ (ยิง API DELETE)
  const executeDelete = async (id) => {
    try {
      await fetch(`${IP_SERVER}/api/products/${id}`, { method: 'DELETE' }); // ยิงลบไปพร้อมแนบ ID
      loadProducts(); // โหลดข้อมูลใหม่เพื่อลบรายการนั้นออกจากหน้าจอ
    } catch (error) {}
  };

  // ==========================================
  // ส่วนที่ 5: ระบบค้นหา (Search / Filter)
  // ==========================================
  // กรองสินค้า (products) โดยเช็คว่าชื่อสินค้ามีคำที่พิมพ์ใน searchQuery ซ่อนอยู่ไหม (ทำงานฝั่งหน้าบ้านเลย ไม่ต้องกวนเซิร์ฟเวอร์)
  const filteredProducts = products.filter(item => {
    const itemName = item.NAME || item.name || '';
    return itemName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ==========================================
  // ส่วนที่ 6: การวาดหน้าจอ (UI Rendering)
  // ==========================================

  // 6.1 ถ้ายังไม่ล็อกอิน ให้วาดหน้าจอ "เข้าสู่ระบบ / สมัครสมาชิก"
  if (!loggedInUser) {
    return (
      <View style={styles.loginContainer}>
        {/* กล่องการ์ดสีขาวตรงกลาง */}
        <View style={styles.loginCard}>
          <Text style={styles.logoText}>DST<Text style={{fontWeight: '300'}}>Gadget</Text></Text>
          <Text style={styles.loginSub}>{isRegistering ? 'Register New Account' : 'Admin Login'}</Text>
          
          {/* ช่องกรอก Username และ Password */}
          <TextInput style={styles.inputFieldAuth} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#A0AEC0" />
          <TextInput style={styles.inputFieldAuth} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#A0AEC0" />
          
          {/* ปุ่ม Sign in / Sign up */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth}><Text style={styles.primaryBtnText}>{isRegistering ? 'Sign Up' : 'Sign In'}</Text></TouchableOpacity>
          
          {/* ปุ่มข้อความสลับโหมด (สมัคร/ล็อกอิน) */}
          <TouchableOpacity style={styles.switchAuthBtn} onPress={() => { setIsRegistering(!isRegistering); setPassword(''); }}>
            <Text style={styles.switchAuthText}>{isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 6.2 ถ้าล็อกอินผ่านแล้ว ให้วาดหน้าจอแอปพลิเคชันหลัก (Dashboard)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAFC" />
      
      {/* 6.2.1 แถบ Header ด้านบนสุด */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DST<Text style={{fontWeight: '300'}}>Gadget</Text></Text>
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
          <Text style={{fontSize: 12, color: '#A0AEC0'}}>User: {loggedInUser}</Text>
          <TouchableOpacity onPress={() => setChangePwdVisible(true)}><Text style={styles.headerLink}>Security</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setLoggedInUser(null)}><Text style={[styles.headerLink, {color: '#E53E3E'}]}>Logout</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* 6.2.2 แถบเครื่องมือ (ช่องค้นหา และ ปุ่ม + New Item) */}
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            {/* ช่องค้นหา ผูกค่ากับ State searchQuery */}
            <TextInput style={styles.searchInput} placeholder="Search inventory..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#A0AEC0" />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={openAddModal}><Text style={styles.primaryBtnText}>+ New Item</Text></TouchableOpacity>
        </View>

        {/* 6.2.3 พื้นที่แสดงสินค้าแบบ Grid 2x2 */}
        <ScrollView style={styles.productScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Inventory Overview <Text style={styles.badge}>{filteredProducts.length}</Text></Text>
          
          <View style={styles.gridContainer}>
            {/* วนลูป (map) เอาข้อมูลสินค้าใน filteredProducts มาสร้างเป็นกล่อง Grid ทีละกล่อง */}
            {filteredProducts.map((item) => (
              <View key={item.id.toString()} style={styles.gridCard}>
                
                {/* รูปสินค้า และ ป้ายสต๊อกมุมซ้ายบน */}
                <View style={styles.cardImagePlaceholder}>
                  {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.cardImage} /> : <Text style={styles.noImageText}>No Image</Text>}
                  {/* เปลี่ยนสีป้ายสต๊อก (เขียว/แดง) ตามจำนวนสต๊อกสินค้าอัตโนมัติ */}
                  <View style={[styles.cardStockBadge, { backgroundColor: item.stock > 0 ? '#C6F6D5' : '#FED7D7' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: item.stock > 0 ? '#22543D' : '#822727' }}>{item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}</Text>
                  </View>
                </View>

                {/* ข้อมูลชื่อ ราคา และรายละเอียด */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.NAME || item.name}</Text>
                  <Text style={styles.cardPrice}>฿ {item.price}</Text>
                  {item.detail ? <Text style={styles.cardDetail} numberOfLines={2}>{item.detail}</Text> : <Text style={styles.cardDetailEmpty}>- No description -</Text>}
                </View>

                {/* ปุ่ม Edit และ Delete ล่างสุดของการ์ด */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.iconBtn, {flex: 1, alignItems: 'center'}]} onPress={() => openEditModal(item)}><Text style={styles.iconText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtnDanger, {flex: 1, alignItems: 'center'}]} onPress={() => handleDelete(item.id)}><Text style={styles.iconTextDanger}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ========================================== */}
      {/* 6.3 หน้าต่าง Modal Pop-up (เพิ่ม/แก้ไขสินค้า) */}
      {/* ========================================== */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* เปลี่ยนหัวข้ออัตโนมัติตามโหมด (Edit Item หรือ New Item) */}
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Item' : 'New Item'}</Text>
              
              <Text style={styles.inputLabel}>Product Image</Text>
              <View style={styles.imageInputContainer}>
                <TouchableOpacity style={styles.uploadBtnSmall} onPress={pickImage}><Text style={styles.uploadBtnText}>+ Upload</Text></TouchableOpacity>
                <Text style={{color: '#A0AEC0', fontSize: 12, fontWeight: 'bold'}}>OR</Text>
                {/* ช่องกรอก Link รูปภาพ */}
                <TextInput style={styles.urlInput} placeholder="Paste Image URL..." value={formData.image && formData.image.length < 1000 ? formData.image : ''} onChangeText={(text) => setFormData(p => ({...p, image: text}))} placeholderTextColor="#A0AEC0" />
              </View>
              {/* แสดงตัวอย่างรูปภาพ (Preview) ถ้ารูปใน formData.image มีข้อมูล */}
              {formData.image && (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: formData.image }} style={styles.previewImageFull} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setFormData(p => ({...p, image: null}))}><Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>✕ Remove</Text></TouchableOpacity>
                </View>
              )}
              
              <Text style={styles.inputLabel}>Product Details</Text>
              <TextInput style={styles.inputField} placeholder="Item Name" value={formData.name} onChangeText={(t) => setFormData(p => ({...p, name: t}))} placeholderTextColor="#A0AEC0" />
              <View style={{flexDirection: 'row', gap: 10}}>
                <TextInput style={[styles.inputField, {flex: 1}]} placeholder="Price (THB)" keyboardType="numeric" value={formData.price} onChangeText={(t) => setFormData(p => ({...p, price: t}))} placeholderTextColor="#A0AEC0" />
                <TextInput style={[styles.inputField, {flex: 1}]} placeholder="Stock Qty" keyboardType="numeric" value={formData.stock} onChangeText={(t) => setFormData(p => ({...p, stock: t}))} placeholderTextColor="#A0AEC0" />
              </View>
              <TextInput style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]} placeholder="Product Description (Optional)" multiline={true} value={formData.detail} onChangeText={(t) => setFormData(p => ({...p, detail: t}))} placeholderTextColor="#A0AEC0" />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setModalVisible(false)}><Text style={styles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}><Text style={styles.primaryBtnText}>Save Changes</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* 6.4 หน้าต่าง Modal Pop-up (ความปลอดภัย - Security) */}
      {/* ========================================== */}
      <Modal visible={changePwdVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 350 }]}>
            <Text style={styles.modalTitle}>Security Settings</Text>
            <TextInput style={styles.inputField} placeholder="Current Password" secureTextEntry value={oldPassword} onChangeText={setOldPassword} placeholderTextColor="#A0AEC0" />
            <TextInput style={styles.inputField} placeholder="New Password" secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholderTextColor="#A0AEC0" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setChangePwdVisible(false); setOldPassword(''); setNewPassword(''); }}><Text style={styles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePassword}><Text style={styles.primaryBtnText}>Update</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// ส่วนที่ 7: CSS Stylesheet ตกแต่งหน้าตา (Minimalist IT Theme)
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7FAFC" }, 
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC', padding: 20 },
  loginCard: { width: '100%', maxWidth: 400, backgroundColor: 'white', padding: 30, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  logoText: { fontSize: 28, fontWeight: '800', color: '#1A202C', textAlign: 'center', letterSpacing: -1 },
  loginSub: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 25, letterSpacing: 1, textTransform: 'uppercase' },
  inputFieldAuth: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F7FAFC', borderRadius: 8, padding: 14, marginBottom: 15, fontSize: 14, color: '#1A202C', outlineStyle: 'none' },
  switchAuthBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 10 },
  switchAuthText: { color: '#4A5568', fontSize: 13, fontWeight: '500', textDecorationLine: 'underline' },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 18, backgroundColor: "white", borderBottomWidth: 1, borderColor: "#E2E8F0" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1A202C", letterSpacing: -0.5 },
  headerLink: { fontSize: 14, fontWeight: '600', color: '#4A5568' },
  mainContent: { flex: 1, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  toolbar: { flexDirection: "row", padding: 20, gap: 15 },
  searchBox: { flex: 1, flexDirection: "row", backgroundColor: "white", borderRadius: 8, paddingHorizontal: 15, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  searchIcon: { color: '#A0AEC0', marginRight: 10, fontWeight: 'bold' },
  searchInput: { flex: 1, height: 45, fontSize: 14, color: '#1A202C', outlineStyle: 'none' },
  primaryBtn: { backgroundColor: "#1A202C", paddingHorizontal: 20, paddingVertical: 14, justifyContent: "center", alignItems: "center", borderRadius: 8 },
  primaryBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  secondaryBtn: { backgroundColor: "transparent", paddingHorizontal: 20, paddingVertical: 12, justifyContent: "center", alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  secondaryBtnText: { color: "#4A5568", fontWeight: "600", fontSize: 14 },
  productScroll: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#4A5568", marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  badge: { backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, fontSize: 12, color: '#1A202C' },
  
  // GRID LAYOUT STYLES (ตั้งค่าพื้นที่สมมาตร 2x2)
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: { width: '48%', backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  cardImagePlaceholder: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginBottom: 12, position: 'relative', overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noImageText: { fontSize: 12, color: '#A0AEC0', fontWeight: 'bold' },
  cardStockBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardInfo: { marginBottom: 15, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: '#1A202C', marginBottom: 4 },
  cardPrice: { fontSize: 16, color: "#2B6CB0", fontWeight: "800", marginBottom: 8 },
  cardDetail: { fontSize: 12, color: '#718096', lineHeight: 18 },
  cardDetailEmpty: { fontSize: 12, color: '#CBD5E0', fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
  iconBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F7FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  iconText: { fontSize: 12, fontWeight: '600', color: '#4A5568' },
  iconBtnDanger: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#FFF5F5', borderRadius: 6, borderWidth: 1, borderColor: '#FED7D7' },
  iconTextDanger: { fontSize: 12, fontWeight: '600', color: '#E53E3E' },
  
  // Modals Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 32, 44, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }, 
  modalContent: { width: '100%', maxWidth: 450, backgroundColor: 'white', borderRadius: 16, padding: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A202C', marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#718096', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputField: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F7FAFC', borderRadius: 8, padding: 14, marginBottom: 15, fontSize: 14, color: '#1A202C', outlineStyle: 'none' },
  imageInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  uploadBtnSmall: { backgroundColor: '#E2E8F0', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8 },
  uploadBtnText: { color: '#4A5568', fontWeight: '600', fontSize: 13 },
  urlInput: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F7FAFC', borderRadius: 8, padding: 12, fontSize: 13, color: '#1A202C', outlineStyle: 'none' },
  imagePreviewWrapper: { height: 160, borderRadius: 8, overflow: 'hidden', marginBottom: 20, position: 'relative', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F7FAFC' },
  previewImageFull: { width: '100%', height: '100%', resizeMode: 'contain' },
  removeImageBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(26,32,44,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'flex-end' },
});