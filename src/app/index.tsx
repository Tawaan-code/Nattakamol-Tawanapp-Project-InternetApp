import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
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
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', detail: '', image: null });

  const IP_SERVER = 'http://119.59.102.161:3015';

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(title, msg);
  };

  const handleAuth = async () => {
    if (!username || !password) return showAlert('Error', 'กรุณากรอกข้อมูลให้ครบถ้วน');
    
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    try {
      const response = await fetch(`${IP_SERVER}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password: password.trim() })
      });
      const data = await response.json();
      
      if (response.ok) {
        if (isRegistering) {
          showAlert('Success', 'สร้างบัญชีสำเร็จ! กรุณาเข้าสู่ระบบ');
          setIsRegistering(false);
          setPassword('');
        } else {
          setLoggedInUser(username.trim().toLowerCase());
          loadProducts();
        }
      } else {
        showAlert('Error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      showAlert('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

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
        setChangePwdVisible(false);
        setOldPassword('');
        setNewPassword('');
      } else {
        showAlert('Error', result.error);
      }
    } catch (error) {
      showAlert('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`${IP_SERVER}/api/products`);
      setProducts(await response.json());
    } catch (error) { console.error(error); }
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

  const openAddModal = () => { setFormData({ name: '', price: '', stock: '', detail: '', image: null }); setIsEditing(false); setModalVisible(true); };
  
  const openEditModal = (item) => {
    setFormData({ 
      name: item.NAME || item.name || '', 
      price: item.price ? item.price.toString() : '', 
      stock: item.stock ? item.stock.toString() : '0', 
      detail: item.detail || '',
      image: item.image_url 
    });
    setEditId(item.id); setIsEditing(true); setModalVisible(true);
  };

  const handleSave = async () => {
    const payload = { 
      name: formData.name ? formData.name.trim() : '', 
      price: parseInt(formData.price) || 0, 
      stock: parseInt(formData.stock) || 0, 
      detail: formData.detail ? formData.detail.trim() : '',
      image: formData.image 
    };
    if (!payload.name) return showAlert('Error', 'กรุณากรอกชื่อสินค้า');

    try {
      const url = isEditing ? `${IP_SERVER}/api/products/${editId}` : `${IP_SERVER}/api/products`;
      const method = isEditing ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setModalVisible(false);
      loadProducts(); 
    } catch (error) { console.error(error); }
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('ยืนยันการลบสินค้านี้?')) executeDelete(id);
    } else {
      Alert.alert('ยืนยัน', 'ต้องการลบสินค้านี้ใช่หรือไม่?', [{ text: 'ยกเลิก', style: 'cancel' }, { text: 'ลบ', style: 'destructive', onPress: () => executeDelete(id) }]); 
    }
  };

  const executeDelete = async (id) => {
    try {
      await fetch(`${IP_SERVER}/api/products/${id}`, { method: 'DELETE' });
      loadProducts(); 
    } catch (error) {}
  };

  const filteredProducts = products.filter(item => {
    const itemName = item.NAME || item.name || '';
    return itemName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!loggedInUser) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.logoText}>DST<Text style={{fontWeight: '300'}}>Gadget</Text></Text>
          <Text style={styles.loginSub}>{isRegistering ? 'Register New Account' : 'Admin Login'}</Text>
          <TextInput style={styles.inputFieldAuth} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#A0AEC0" />
          <TextInput style={styles.inputFieldAuth} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#A0AEC0" />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth}><Text style={styles.primaryBtnText}>{isRegistering ? 'Sign Up' : 'Sign In'}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.switchAuthBtn} onPress={() => { setIsRegistering(!isRegistering); setPassword(''); }}>
            <Text style={styles.switchAuthText}>{isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAFC" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DST<Text style={{fontWeight: '300'}}>Gadget</Text></Text>
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
          <Text style={{fontSize: 12, color: '#A0AEC0'}}>User: {loggedInUser}</Text>
          <TouchableOpacity onPress={() => setChangePwdVisible(true)}><Text style={styles.headerLink}>Security</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setLoggedInUser(null)}><Text style={[styles.headerLink, {color: '#E53E3E'}]}>Logout</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Search inventory..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#A0AEC0" />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={openAddModal}><Text style={styles.primaryBtnText}>+ New Item</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.productScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Inventory Overview <Text style={styles.badge}>{filteredProducts.length}</Text></Text>
          <View style={styles.gridContainer}>
            {filteredProducts.map((item) => (
              <View key={item.id.toString()} style={styles.gridCard}>
                <View style={styles.cardImagePlaceholder}>
                  {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.cardImage} /> : <Text style={styles.noImageText}>No Image</Text>}
                  <View style={[styles.cardStockBadge, { backgroundColor: item.stock > 0 ? '#C6F6D5' : '#FED7D7' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: item.stock > 0 ? '#22543D' : '#822727' }}>{item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}</Text>
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.NAME || item.name}</Text>
                  <Text style={styles.cardPrice}>฿ {item.price}</Text>
                  {item.detail ? <Text style={styles.cardDetail} numberOfLines={2}>{item.detail}</Text> : <Text style={styles.cardDetailEmpty}>- No description -</Text>}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.iconBtn, {flex: 1, alignItems: 'center'}]} onPress={() => openEditModal(item)}><Text style={styles.iconText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtnDanger, {flex: 1, alignItems: 'center'}]} onPress={() => handleDelete(item.id)}><Text style={styles.iconTextDanger}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Item' : 'New Item'}</Text>
              <Text style={styles.inputLabel}>Product Image</Text>
              <View style={styles.imageInputContainer}>
                <TouchableOpacity style={styles.uploadBtnSmall} onPress={pickImage}><Text style={styles.uploadBtnText}>+ Upload</Text></TouchableOpacity>
                <Text style={{color: '#A0AEC0', fontSize: 12, fontWeight: 'bold'}}>OR</Text>
                <TextInput style={styles.urlInput} placeholder="Paste Image URL..." value={formData.image && formData.image.length < 1000 ? formData.image : ''} onChangeText={(text) => setFormData(p => ({...p, image: text}))} placeholderTextColor="#A0AEC0" />
              </View>
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
  
  // GRID
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
  
  // Modals
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