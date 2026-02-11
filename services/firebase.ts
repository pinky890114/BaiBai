import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  query, 
  orderBy, 
  setDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { Commission, CommissionType } from "../types";
import { DEFAULT_COMMISSION_TYPES, MOCK_COMMISSIONS } from "../constants";

// ============================================================================
// 步驟 1: 請將您的 Firebase Config 貼在下方
// 前往 Firebase Console -> Project Settings -> General -> 下滑找到 "Your apps"
// ============================================================================

const firebaseConfig = {

  apiKey: "AIzaSyBTIFiTisafGNaSCOgiQImTFBnH5b5GO0E",

  authDomain: "baibai-99bb3.firebaseapp.com",

  projectId: "baibai-99bb3",

  storageBucket: "baibai-99bb3.firebasestorage.app",

  messagingSenderId: "13801058458",

  appId: "1:13801058458:web:396e0615b40e10a554af23",

  measurementId: "G-FSYSQVY4W9"

};

// ============================================================================

// 檢查是否已填入正確的金鑰 (簡單檢查 projectId 是否被替換)
const isFirebaseConfigured = firebaseConfig.projectId !== "YOUR_PROJECT_ID";

let db: any = null;
let storage: any = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("✅ Firebase 連線成功 (雲端模式)");
  } catch (error) {
    console.error("❌ Firebase 初始化失敗:", error);
  }
} else {
  console.warn("⚠️ 尚未設定 Firebase 金鑰，目前使用 [本機儲存模式]。請至 services/firebase.ts 填入設定以啟用雲端同步。");
}

// Collection References
const COMMISSIONS_COLLECTION = "commissions";
const SETTINGS_COLLECTION = "settings";
const GLOBAL_SETTINGS_DOC = "global";

// Types
export interface GlobalSettings {
  isOpen: boolean;
  types: CommissionType[];
}

// --- Connection Status Management ---
export type ConnectionStatus = 'connecting' | 'connected' | 'offline';
let currentStatus: ConnectionStatus = 'connecting';
let statusListeners: ((status: ConnectionStatus) => void)[] = [];

const notifyStatus = (status: ConnectionStatus) => {
    if (currentStatus !== status) {
        currentStatus = status;
        statusListeners.forEach(cb => cb(status));
    }
};

export const subscribeToConnectionStatus = (callback: (status: ConnectionStatus) => void) => {
    statusListeners.push(callback);
    callback(currentStatus);
    return () => {
        statusListeners = statusListeners.filter(cb => cb !== callback);
    };
};

// --- LocalStorage Helpers (Fallback Mode / 本機模式) ---
const STORAGE_KEY_COMMISSIONS = 'arttrack_commissions_zh_v1';
const STORAGE_KEY_SETTINGS = 'arttrack_settings_v1';

let commissionListeners: ((data: Commission[]) => void)[] = [];
let settingsListeners: ((data: GlobalSettings) => void)[] = [];

const getLocalCommissions = (): Commission[] => {
    const stored = localStorage.getItem(STORAGE_KEY_COMMISSIONS);
    if (!stored) return MOCK_COMMISSIONS;
    try {
        return JSON.parse(stored);
    } catch {
        return MOCK_COMMISSIONS;
    }
};

const saveLocalCommissions = (data: Commission[]) => {
    localStorage.setItem(STORAGE_KEY_COMMISSIONS, JSON.stringify(data));
    commissionListeners.forEach(cb => cb(data));
};

const getLocalSettings = (): GlobalSettings => {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!stored) return { isOpen: true, types: DEFAULT_COMMISSION_TYPES };
    try {
        return JSON.parse(stored);
    } catch {
        return { isOpen: true, types: DEFAULT_COMMISSION_TYPES };
    }
};

const saveLocalSettings = (data: GlobalSettings) => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(data));
    settingsListeners.forEach(cb => cb(data));
};

// --- Error Handling Helper ---
let hasAlertedError = false;

const handleFirebaseError = (error: any) => {
    notifyStatus('offline'); // Mark as offline on error
    console.error("🔥 Firebase Error Detected:", error);
    
    if (!hasAlertedError) {
        if (error.message && error.message.includes("Cloud Firestore API")) {
            alert("⚠️ Firebase 資料庫尚未啟用\n\n請前往 Firebase Console -> Build -> Firestore Database\n點擊「Create Database」並選擇「Start in test mode」。\n\n目前系統將使用「本機模式」運作，您的資料暫時不會同步到雲端。");
            hasAlertedError = true;
        } else if (error.code === 'permission-denied') {
             console.warn("Firebase 權限不足，切換為本機模式");
             hasAlertedError = true;
        }
    }
};

// --- Service Functions ---

/**
 * 上傳圖片到 Firebase Storage
 */
export const uploadCommissionImage = async (file: File): Promise<string> => {
    const toBase64 = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(f);
        });
    };

    if (storage) {
        try {
            const fileName = `commission_images/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("☁️ Storage 上傳失敗，嘗試轉為 Base64 本地儲存:", error);
            return await toBase64(file);
        }
    } else {
        return await toBase64(file);
    }
};

/**
 * 監聽委託單列表
 */
export const subscribeToCommissions = (callback: (commissions: Commission[]) => void) => {
  if (db) {
    // 雲端模式
    const q = query(collection(db, COMMISSIONS_COLLECTION), orderBy("dateAdded", "desc"));
    return onSnapshot(q, (snapshot) => {
      notifyStatus('connected'); // Success!
      const commissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Commission[];
      callback(commissions);
    }, (error) => {
      handleFirebaseError(error);
      callback(getLocalCommissions());
    });
  } else {
    // 本機模式
    notifyStatus('offline');
    commissionListeners.push(callback);
    callback(getLocalCommissions());
    return () => {
        commissionListeners = commissionListeners.filter(cb => cb !== callback);
    };
  }
};

/**
 * 監聽全域設定
 */
export const subscribeToSettings = (callback: (settings: GlobalSettings) => void) => {
  if (db) {
    // 雲端模式
    const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as GlobalSettings);
      } else {
        const defaultSettings: GlobalSettings = { isOpen: true, types: DEFAULT_COMMISSION_TYPES };
        setDoc(docRef, defaultSettings).catch(e => console.warn("無法寫入初始設定:", e));
        callback(defaultSettings);
      }
    }, (error) => {
      // Don't alert again here, subscribeToCommissions will handle it
      callback(getLocalSettings());
    });
  } else {
    // 本機模式
    settingsListeners.push(callback);
    callback(getLocalSettings());
    return () => {
        settingsListeners = settingsListeners.filter(cb => cb !== callback);
    };
  }
};

/**
 * 新增委託單
 */
export const addCommissionToCloud = async (commission: Commission) => {
  if (db && currentStatus === 'connected') {
    try {
      await setDoc(doc(db, COMMISSIONS_COLLECTION, commission.id), commission);
    } catch (e) {
      console.error("雲端新增失敗，切換至本地儲存: ", e);
      const current = getLocalCommissions();
      saveLocalCommissions([commission, ...current]);
    }
  } else {
    const current = getLocalCommissions();
    saveLocalCommissions([commission, ...current]);
  }
};

/**
 * 更新委託單
 */
export const updateCommissionInCloud = async (commission: Commission) => {
  if (db && currentStatus === 'connected') {
    try {
      const docRef = doc(db, COMMISSIONS_COLLECTION, commission.id);
      await updateDoc(docRef, { ...commission });
    } catch (e) {
      console.error("雲端更新失敗，切換至本地儲存: ", e);
      const current = getLocalCommissions();
      const updated = current.map(c => c.id === commission.id ? commission : c);
      saveLocalCommissions(updated);
    }
  } else {
    const current = getLocalCommissions();
    const updated = current.map(c => c.id === commission.id ? commission : c);
    saveLocalCommissions(updated);
  }
};

/**
 * 刪除委託單
 */
export const deleteCommissionFromCloud = async (id: string) => {
  if (db && currentStatus === 'connected') {
    try {
      await deleteDoc(doc(db, COMMISSIONS_COLLECTION, id));
    } catch (e) {
      console.error("雲端刪除失敗，切換至本地儲存: ", e);
      const current = getLocalCommissions();
      const updated = current.filter(c => c.id !== id);
      saveLocalCommissions(updated);
    }
  } else {
    const current = getLocalCommissions();
    const updated = current.filter(c => c.id !== id);
    saveLocalCommissions(updated);
  }
};

/**
 * 更新全域設定
 */
export const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
  if (db && currentStatus === 'connected') {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
      await setDoc(docRef, settings, { merge: true });
    } catch (e) {
       console.error("雲端設定更新失敗，切換至本地儲存: ", e);
       const current = getLocalSettings();
       saveLocalSettings({ ...current, ...settings });
    }
  } else {
    const current = getLocalSettings();
    saveLocalSettings({ ...current, ...settings });
  }
};
