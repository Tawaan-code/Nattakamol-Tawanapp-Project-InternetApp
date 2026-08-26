import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function App() {
  // ================= State ทั้งหมด =================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [changePwdVisible, setChangePwdVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', image: null });

  // URL สำหรับยิง API ไปที่เซิร์ฟเวอร์
  const API_URL = 'http://119.59.102.161:3015/api/products';
  const LOGIN_URL = 'http://119.59.102.161:3015/api/login';
  const CHANGE_PWD_URL = 'http://119.59.102.161:3015/api/change-password';

  // ================= ระบบ Login & เปลี่ยนรหัส =================
  const handleLogin = async () => {
    try {
      const payload = { username: username.trim().toLowerCase(), password: password.trim() };
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setIsLoggedIn(true);
        loadProducts();
      } else {
        if (Platform.OS === 'web') window.alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        else Alert.alert('Error', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      if (Platform.OS === 'web') window.alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      else Alert.alert('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      return Platform.OS === 'web' ? window.alert('กรุณากรอกข้อมูลให้ครบ') : Alert.alert('Error', 'กรุณากรอกข้อมูลให้ครบ');
    }
    try {
      const response = await fetch(CHANGE_PWD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPassword.trim(), newPassword: newPassword.trim() })
      });
      const result = await response.json();
      if (response.ok) {
        if (Platform.OS === 'web') window.alert('เปลี่ยนรหัสผ่านสำเร็จ!');
        else Alert.alert('Success', 'เปลี่ยนรหัสผ่านสำเร็จ!');
        setChangePwdVisible(false);
        setOldPassword('');
        setNewPassword('');
      } else {
        if (Platform.OS === 'web') window.alert(result.error);
        else Alert.alert('Error', result.error);
      }
    } catch (error) {
      if (Platform.OS === 'web') window.alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      else Alert.alert('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  // ================= ระบบจัดการสินค้า (CRUD) =================
  const loadProducts = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Load error: ", error);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/jpeg, image/png';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => setFormData({ ...formData, image: event.target.result });
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setFormData(prev => ({ ...prev, image: result.assets[0].uri }));
  };

  const openAddModal = () => { setFormData({ name: '', price: '', stock: '', image: null }); setIsEditing(false); setModalVisible(true); };
  
  const openEditModal = (item) => {
    setFormData({ name: item.NAME || item.name, price: item.price ? item.price.toString() : '', stock: item.stock ? item.stock.toString() : '0', image: item.image_url });
    setEditId(item.id); setIsEditing(true); setModalVisible(true);
  };

  const handleSave = async () => {
    const payload = { name: formData.name.trim(), price: parseInt(formData.price) || 0, stock: parseInt(formData.stock) || 0, image: formData.image };
    if (!payload.name) return Platform.OS === 'web' ? window.alert('Name is required') : Alert.alert('Error', 'Name is required');

    try {
      const url = isEditing ? `${API_URL}/${editId}` : API_URL;
      const method = isEditing ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setModalVisible(false);
      loadProducts(); 
    } catch (error) { console.error(error); }
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this?')) executeDelete(id);
    } else {
      Alert.alert('Confirm Delete', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => executeDelete(id) }]); 
    }
  };

  const executeDelete = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      loadProducts(); 
    } catch (error) { console.error(error); }
  };

  const filteredProducts = products.filter(item => {
    const itemName = item.NAME || item.name || '';
    return itemName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ================= หน้าจอ Login =================
  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>System Login</Text>
        <TextInput style={styles.loginInput} placeholder="Username (admin)" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.loginInput} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}><Text style={styles.loginBtnText}>Login</Text></TouchableOpacity>
      </View>
    );
  }

  // ================= หน้าจอแอปพลิเคชันหลัก =================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f8ff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DSTGadget Admin</Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <TouchableOpacity onPress={() => setChangePwdVisible(true)}><Text style={{color: '#007AFF', fontWeight: 'bold'}}>เปลี่ยนรหัส</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setIsLoggedIn(false)}><Text style={{color: 'red', fontWeight: 'bold'}}>Logout</Text></TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Search products..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}><Text style={styles.addButtonText}>+ Add</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.productContainer}>
          <Text style={styles.sectionTitle}>Inventory ({filteredProducts.length} Items)</Text>
          {filteredProducts.map((item) => (
            <View key={item.id.toString()} style={styles.productCard}>
              <Image source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} style={styles.imagePlaceholder} />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.NAME || item.name}</Text>
                <Text style={styles.productPrice}>฿ {item.price}</Text>
                <Text style={styles.productStock}>{item.stock_text}</Text>
              </View>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}><Text>✏️</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}><Text>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Modal เพิ่ม/แก้ไขสินค้า */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Product' : 'Add New Product'}</Text>
              <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
                {formData.image ? <Image source={{ uri: formData.image }} style={styles.previewImage} /> : <Text>📸 Tap to select image</Text>}
              </TouchableOpacity>
              <TextInput style={styles.inputField} placeholder="Product Name" value={formData.name} onChangeText={(t) => setFormData(p => ({...p, name: t}))} />
              <TextInput style={styles.inputField} placeholder="Price" keyboardType="numeric" value={formData.price} onChangeText={(t) => setFormData(p => ({...p, price: t}))} />
              <TextInput style={styles.inputField} placeholder="Stock" keyboardType="numeric" value={formData.stock} onChangeText={(t) => setFormData(p => ({...p, stock: t}))} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{color:'white'}}>Save</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal เปลี่ยนรหัสผ่าน */}
      <Modal visible={changePwdVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 350 }]}>
            <Text style={styles.modalTitle}>เปลี่ยนรหัสผ่าน</Text>
            <TextInput style={styles.inputField} placeholder="รหัสผ่านเดิม" secureTextEntry value={oldPassword} onChangeText={setOldPassword} />
            <TextInput style={styles.inputField} placeholder="รหัสผ่านใหม่" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setChangePwdVisible(false); setOldPassword(''); setNewPassword(''); }}><Text>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword}><Text style={{color:'white'}}>บันทึก</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f0f8ff' },
  loginTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#007AFF' },
  loginInput: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  loginBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  loginBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  container: { flex: 1, backgroundColor: "#f0f8ff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, backgroundColor: "white", borderBottomWidth: 1, borderColor: "#e1e8ed" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#007AFF" },
  searchContainer: { flexDirection: "row", padding: 15, backgroundColor: "white", gap: 10 },
  searchBar: { flex: 1, flexDirection: "row", backgroundColor: "#f8f9fa", borderRadius: 8, paddingHorizontal: 10, alignItems: "center", borderWidth: 1, borderColor: "#e1e8ed" },
  searchIcon: { marginRight: 5 },
  searchInput: { flex: 1, height: 40, outlineStyle: 'none' },
  addButton: { backgroundColor: "#007AFF", paddingHorizontal: 15, justifyContent: "center", borderRadius: 8 },
  addButtonText: { color: "white", fontWeight: "bold" },
  productContainer: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 15 },
  productCard: { flexDirection: "row", backgroundColor: "white", padding: 12, borderRadius: 10, marginBottom: 12, shadowColor: "#000", elevation: 2 },
  imagePlaceholder: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' },
  productInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: "600" },
  productPrice: { color: "#007AFF", fontWeight: "bold", marginVertical: 4 },
  productStock: { fontSize: 12, color: '#666' },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { padding: 8, backgroundColor: '#f0f8ff', borderRadius: 6, borderWidth: 1, borderColor: '#007AFF' },
  deleteBtn: { padding: 8, backgroundColor: '#fff0f0', borderRadius: 6, borderWidth: 1, borderColor: '#ff3b30' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }, 
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputField: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, outlineStyle: 'none' },
  imageUploadBtn: { height: 120, backgroundColor: '#e6f2ff', borderRadius: 8, borderWidth: 1, borderColor: '#007AFF', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  previewImage: { width: '100%', height: '100%', borderRadius: 8 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#007AFF', alignItems: 'center' }
});