import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function App() {
  const [activeTab, setActiveTab] = useState('Products');
  const [products, setProducts] = useState([]);
  
  // URL ของ Cloud Server คุณ
  const API_URL = 'http://119.59.102.161:3015/api/products';

  const loadProducts = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("โหลดข้อมูลไม่ได้: ", error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', image: null });

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg, image/png';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setFormData({ ...formData, image: event.target.result });
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } catch (error) {
        console.error(error);
      }
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions!');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setFormData(prev => ({ ...prev, image: result.assets[0].uri }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', price: '', stock: '', image: null });
    setIsEditing(false);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setFormData({ 
      name: item.NAME || item.name, 
      price: item.price ? item.price.toString() : '', 
      stock: item.stock ? item.stock.toString() : '0', 
      image: item.image_url 
    });
    setEditId(item.id);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const safeName = formData.name ? String(formData.name).trim() : '';
    const safePrice = formData.price ? String(formData.price).trim() : '';
    const safeStock = formData.stock ? String(formData.stock).trim() : '';

    if (!safeName || !safePrice || !safeStock) {
      if (Platform.OS === 'web') window.alert('Please fill in all fields (Name, Price, Stock)');
      else Alert.alert('Error', 'Please fill in all fields (Name, Price, Stock)');
      return;
    }

    const payload = {
      name: safeName,
      price: parseInt(safePrice) || 0,
      stock: parseInt(safeStock) || 0,
      image: formData.image
    };

    try {
      if (isEditing) {
        const response = await fetch(`${API_URL}/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          if (Platform.OS !== 'web') Alert.alert('Success', 'อัปเดตสินค้าเรียบร้อย!');
        } else {
          if (Platform.OS !== 'web') Alert.alert('Error', 'ไม่สามารถอัปเดตสินค้าได้');
        }
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.status === 201) {
          if (Platform.OS !== 'web') Alert.alert('Success', 'เพิ่มสินค้าใหม่เรียบร้อย!');
        } else {
          if (Platform.OS !== 'web') Alert.alert('Error', 'ไม่สามารถเพิ่มสินค้าได้');
        }
      }
      
      setModalVisible(false);
      loadProducts(); 
      
    } catch (error) {
      console.error("API Error: ", error);
      if (Platform.OS !== 'web') Alert.alert('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  // ==========================================
  // ฟังก์ชันสำหรับการลบ (DELETE)
  // ==========================================
  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) {
        executeDelete(id);
      }
    } else {
      Alert.alert('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?', [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ลบ', style: 'destructive', onPress: () => executeDelete(id) }
      ]);
    }
  };

  const executeDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        if (Platform.OS !== 'web') Alert.alert('Success', 'ลบสินค้าเรียบร้อย!');
        loadProducts(); 
      } else {
        if (Platform.OS !== 'web') Alert.alert('Error', 'ไม่สามารถลบสินค้าได้');
      }
    } catch (error) {
      console.error("Delete Error: ", error);
      if (Platform.OS !== 'web') Alert.alert('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const renderProducts = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor="#999" />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.productContainer}>
        <Text style={styles.sectionTitle}>Inventory ({products.length} Items)</Text>
        
        {products.length === 0 ? (
          <Text style={styles.emptyText}>No products available.</Text>
        ) : (
          products.map((item) => (
            <View key={item.id.toString()} style={styles.productCard}>
              <View style={styles.imagePlaceholder}>
                <Image source={{ uri: item.image_url || 'https://via.placeholder.com/150/e6f2ff/007AFF?text=No+Image' }} style={styles.productImage} />
              </View>
              
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.NAME || item.name}</Text>
                <Text style={styles.productPrice}>฿ {item.price}</Text>
                <Text style={[styles.productStock, { color: parseInt(item.stock) === 0 ? '#ff3b30' : '#34c759' }]}>
                  {parseInt(item.stock) === 0 ? 'Out of Stock' : (item.stock_text || `${item.stock} in stock`)}
                </Text>
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}><Text>✏️</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}><Text>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f8ff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}><Text style={styles.menuIcon}>☰</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>DSTGadget</Text>
        <TouchableOpacity style={styles.profileButton}><Text style={styles.profileIcon}>👤</Text></TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'Home' && <View style={styles.centerScreen}><Text style={{ fontSize: 60, marginBottom: 10 }}>🏠</Text><Text style={styles.pageTitle}>Welcome to DSTGadget</Text></View>}
        {activeTab === 'Products' && renderProducts()}
        {activeTab === 'Categories' && <View style={styles.centerScreen}><Text style={{ fontSize: 60, marginBottom: 10 }}>📁</Text><Text style={styles.pageTitle}>Product Categories</Text></View>}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Product' : 'Add New Product'}</Text>
              
              <Text style={styles.inputLabel}>Product Image (.jpg / .png)</Text>
              <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
                {formData.image ? (
                  <Image source={{ uri: formData.image }} style={styles.previewImage} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, marginBottom: 5 }}>📸</Text>
                    <Text style={{ color: '#007AFF', fontWeight: '500' }}>Tap to select image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Product Name</Text>
              <TextInput 
                style={styles.inputField} 
                placeholder="e.g. Mechanical Keyboard" 
                value={formData.name} 
                onChangeText={(text) => setFormData(prev => ({...prev, name: text}))} 
              />

              <Text style={styles.inputLabel}>Price (฿)</Text>
              <TextInput 
                style={styles.inputField} 
                placeholder="e.g. 1500" 
                keyboardType="numeric" 
                value={formData.price} 
                onChangeText={(text) => setFormData(prev => ({...prev, price: text}))} 
              />

              <Text style={styles.inputLabel}>Stock Quantity</Text>
              <TextInput 
                style={styles.inputField} 
                placeholder="e.g. 20" 
                keyboardType="numeric" 
                value={formData.stock} 
                onChangeText={(text) => setFormData(prev => ({...prev, stock: text}))} 
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Home')}><Text style={styles.navIcon}>🏠</Text><Text style={[styles.navText, activeTab === 'Home' && styles.activeNavText]}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={openAddModal}><Text style={styles.navIcon}>➕</Text><Text style={styles.navText}>Add</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Products')}><Text style={styles.navIcon}>📦</Text><Text style={[styles.navText, activeTab === 'Products' && styles.activeNavText]}>Products</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Categories')}><Text style={styles.navIcon}>📁</Text><Text style={[styles.navText, activeTab === 'Categories' && styles.activeNavText]}>Categories</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f8ff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e1e8ed" },
  menuButton: { width: 30, height: 30, justifyContent: "center", alignItems: "center" },
  menuIcon: { fontSize: 18, color: "#333" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#007AFF" },
  profileButton: { width: 30, height: 30, backgroundColor: "#007AFF", borderRadius: 15, justifyContent: "center", alignItems: "center" },
  profileIcon: { fontSize: 16, color: "white" },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#1c2833' },
  searchContainer: { flexDirection: "row", padding: 15, backgroundColor: "white", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#e1e8ed" },
  searchBar: { flex: 1, flexDirection: "row", backgroundColor: "#f8f9fa", borderRadius: 8, paddingHorizontal: 10, alignItems: "center", height: 40, borderWidth: 1, borderColor: "#e1e8ed" },
  searchIcon: { fontSize: 16, marginRight: 5 },
  searchInput: { flex: 1, fontSize: 14 },
  addButton: { backgroundColor: "#007AFF", paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, justifyContent: "center" },
  addButtonText: { color: "white", fontSize: 13, fontWeight: "bold" },
  productContainer: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 15 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999', fontStyle: 'italic' },
  productCard: { flexDirection: "row", backgroundColor: "white", padding: 12, borderRadius: 10, marginBottom: 12, alignItems: "center", shadowColor: "#007AFF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  imagePlaceholder: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', marginRight: 12, backgroundColor: '#f0f0f0' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: "600", color: "#1c2833", marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: "bold", color: "#007AFF", marginBottom: 4 },
  productStock: { fontSize: 12, fontWeight: '500' },
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8, backgroundColor: '#f0f8ff', borderRadius: 6, borderWidth: 1, borderColor: '#007AFF' },
  deleteBtn: { padding: 8, backgroundColor: '#fff0f0', borderRadius: 6, borderWidth: 1, borderColor: '#ff3b30' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }, 
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, shadowColor: '#000', elevation: 5, maxHeight: '90%', width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: '600' },
  inputField: { borderWidth: 1, borderColor: '#e1e8ed', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 14, backgroundColor: '#f8f9fa', color: '#333' },
  imageUploadBtn: { height: 120, backgroundColor: '#e6f2ff', borderRadius: 8, borderWidth: 1, borderColor: '#007AFF', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10, marginBottom: 30 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f8f9fa', alignItems: 'center', borderWidth: 1, borderColor: '#e1e8ed' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#007AFF', alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  bottomNav: { flexDirection: "row", backgroundColor: "white", paddingVertical: 10, paddingBottom: 25, borderTopWidth: 1, borderTopColor: "#e1e8ed" },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 5 },
  navIcon: { fontSize: 22, marginBottom: 4 },
  navText: { fontSize: 11, color: "#999" },
  activeNavText: { color: "#007AFF", fontWeight: 'bold' },
});