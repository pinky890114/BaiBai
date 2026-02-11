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
  deleteDoc,
  initializeFirestore
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
// 步驟 1: Firebase Config
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
// 步驟 2: 資料庫設定
// ============================================================================

const DATABASE_ID: string = "baibai"; 

// ============================================================================

const isFirebaseConfigured = firebaseConfig.projectId !== "YOUR_PROJECT_ID";

let db: any = null;
let storage: any = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    
    // 初始化 Firestore (簡化邏輯，使用標準 getFirestore)
    if (DATABASE_ID && DATABASE_ID !== "(default)") {
        console.log(`正在連線至具名資料庫: ${DATABASE_ID}`);
        try {
            db = getFirestore(app, DATABASE_ID);
        } catch (e) {
            console.warn("getFirestore 初始化失敗，嘗試 initializeFirestore", e);
            // 備用方案：如果 getFirestore 失敗，嘗試 initializeFirestore
            try {
                db = initializeFirestore(app, {}, DATABASE_ID);
            } catch (initError) {
                console.error("Database 初始化完全失敗", initError);
            }
        }
    } else {
        db = getFirestore(app);
    }

    storage = getStorage(app);
    console.log("✅ Firebase SDK 初始化完成");
  } catch (error) {
    console.error("❌ Firebase 初始化失敗:", error);
  }
} else {
  console.warn("⚠️ 尚未設定 Firebase 金鑰，目前使用 [本機儲存模式]。");
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

// 安全的 LocalStorage 寫入 (防止 QuotaExceededError)
const saveLocalCommissions = (data: Commission[]) => {
    try {
        localStorage.setItem(STORAGE_KEY_COMMISSIONS, JSON.stringify(data));
        commissionListeners.forEach(cb => cb(data));
    } catch (e) {
        console.error("❌ LocalStorage 儲存失敗 (可能是空間不足):", e);
        alert("⚠️ 瀏覽器儲存空間已滿，無法儲存部分資料。建議清除快取或刪除舊圖片。");
    }
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
    try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(data));
        settingsListeners.forEach(cb => cb(data));
    } catch (e) {
        console.error("❌ Settings 儲存失敗:", e);
    }
};

// --- Error Handling Helper ---
let hasLoggedError = false;

const handleFirebaseError = (error: any) => {
    notifyStatus('offline'); // Mark as offline on error
    
    // 只在 console 顯示一次詳細錯誤，避免洗版
    if (!hasLoggedError) {
        console.warn("🔥 無法連線至 Firestore，已切換至本機模式 (Local Mode)。");
        // 忽略 AbortError (通常是網路中斷或組件卸載)
        if (error?.name !== 'AbortError' && error?.code !== 'aborted') {
            console.error("詳細錯誤原因:", error);
        }
        
        if (error.code === 'not-found') {
             console.warn(`💡 找不到資料庫。請確認 services/firebase.ts 中的 DATABASE_ID 是否正確。\n目前設定為: "${DATABASE_ID}"`);
        } else if (error.code === 'permission-denied') {
             console.error("🛑 權限不足 (Permission Denied)");
             console.warn("💡 請確認 Firebase Rules 是否已設定為允許讀寫。");
        }
        hasLoggedError = true;
    }
};

// --- Service Functions ---

/**
 * 圖片壓縮與上傳
 * 自動將圖片壓縮至最大邊長 1200px，品質 0.7 (JPEG)
 */
export const uploadCommissionImage = async (file: File): Promise<string> => {
    // 壓縮 helper
    const compressImage = (sourceFile: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };
            reader.onerror = (e) => reject(new Error("FileReader failed"));
            reader.onabort = () => reject(new Error("FileReader aborted"));

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // 設定最大邊長，避免圖片過大 (例如限制在 1200px)
                const MAX_SIZE = 1200;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas Context Error"));
                    return;
                }
                
                // 繪製並重設大小
                ctx.drawImage(img, 0, 0, width, height);

                // 輸出壓縮後的 Blob (JPEG, 品質 0.7)
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Compression Failed"));
                    }
                }, 'image/jpeg', 0.7);
            };
            
            // 增加圖片載入錯誤處理
            img.onerror = (e) => reject(new Error("Image load failed"));
        });
    };

    // Blob 轉 Base64 (給 Local 模式用)
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    try {
        console.log(`Original size: ${(file.size / 1024).toFixed(2)} KB`);
        // 嘗試壓縮
        let blobToUpload: Blob;
        try {
            blobToUpload = await compressImage(file);
            console.log(`Compressed size: ${(blobToUpload.size / 1024).toFixed(2)} KB`);
        } catch (compressError) {
            console.warn("Image compression failed, using original file:", compressError);
            blobToUpload = file; // 壓縮失敗則使用原圖
        }

        if (storage) {
            try {
                // 使用壓縮後的 Blob 上傳
                const fileName = `commission_images/${Date.now()}_img.jpg`;
                const storageRef = ref(storage, fileName);
                
                // uploadBytes 接受 Blob
                const snapshot = await uploadBytes(storageRef, blobToUpload);
                const downloadURL = await getDownloadURL(snapshot.ref);
                return downloadURL;
            } catch (error) {
                console.error("☁️ Storage 上傳失敗 (可能網路不穩)，轉為 Base64 本地儲存:", error);
                // 上傳失敗時，存 Base64 到 LocalStorage
                return await blobToBase64(blobToUpload);
            }
        } else {
            // 沒有 Storage 時，存 Base64 到 LocalStorage
            return await blobToBase64(blobToUpload);
        }
    } catch (e) {
        console.error("Critical Image processing error:", e);
        // 如果連壓縮或轉檔都完全失敗，嘗試回傳原始檔案的 Base64
        try {
             return await blobToBase64(file);
        } catch (finalError) {
             return ""; // 真的沒辦法了
        }
    }
};

/**
 * 監聽委託單列表
 */
export const subscribeToCommissions = (callback: (commissions: Commission[]) => void) => {
  if (db) {
    // 雲端模式
    const q = query(collection(db, COMMISSIONS_COLLECTION), orderBy("dateAdded", "desc"));
    
    let usingLocalListener = false;

    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      notifyStatus('connected'); // Success!
      const commissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Commission[];
      callback(commissions);
    }, (error) => {
      handleFirebaseError(error);
      
      // Fallback to local
      usingLocalListener = true;
      if (!commissionListeners.includes(callback)) {
          commissionListeners.push(callback);
      }
      callback(getLocalCommissions());
    });

    return () => {
      unsubscribeFirestore();
      if (usingLocalListener) {
          commissionListeners = commissionListeners.filter(cb => cb !== callback);
      }
    };
  } else {
    // 本機模式 (未設定 API Key)
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
    
    let usingLocalListener = false;

    const unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as GlobalSettings);
      } else {
        const defaultSettings: GlobalSettings = { isOpen: true, types: DEFAULT_COMMISSION_TYPES };
        setDoc(docRef, defaultSettings).catch(e => console.warn("無法寫入初始設定:", e));
        callback(defaultSettings);
      }
    }, (error) => {
      handleFirebaseError(error);
      
      // Fallback to local
      usingLocalListener = true;
      if (!settingsListeners.includes(callback)) {
          settingsListeners.push(callback);
      }
      callback(getLocalSettings());
    });

    return () => {
        unsubscribeFirestore();
        if (usingLocalListener) {
            settingsListeners = settingsListeners.filter(cb => cb !== callback);
        }
    };
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
  // 即使 db 存在，如果目前狀態是 offline，也直接寫入 local
  if (db && currentStatus === 'connected') {
    try {
      await setDoc(doc(db, COMMISSIONS_COLLECTION, commission.id), commission);
    } catch (e) {
      console.error("雲端新增失敗，切換至本地儲存: ", e);
      // Fallback
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
