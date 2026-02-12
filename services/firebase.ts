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

// --- LocalStorage Helpers (僅用於讀取備份或開發測試，不再用於寫入失敗的自動備案) ---
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

const getLocalSettings = (): GlobalSettings => {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!stored) return { isOpen: true, types: DEFAULT_COMMISSION_TYPES };
    try {
        return JSON.parse(stored);
    } catch {
        return { isOpen: true, types: DEFAULT_COMMISSION_TYPES };
    }
};

// --- Error Handling Helper ---
let hasLoggedError = false;

const handleFirebaseError = (error: any) => {
    notifyStatus('offline');
    if (!hasLoggedError) {
        console.warn("🔥 無法連線至 Firestore，已切換至本機模式 (Local Mode)。");
        if (error?.name !== 'AbortError' && error?.code !== 'aborted') {
            console.error("詳細錯誤原因:", error);
        }
        hasLoggedError = true;
    }
};

// --- Timeout Helper ---
// 強制讓任何 Promise 在指定時間內結束，否則 Reject
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    let timer: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMessage)), ms);
    });
    return Promise.race([
        promise.then(res => { clearTimeout(timer); return res; }),
        timeoutPromise
    ]);
};

// --- Service Functions ---

/**
 * 圖片壓縮與上傳
 * 自動將圖片壓縮至最大邊長 1200px，品質 0.7 (JPEG)
 * 加入 15 秒超時機制
 */
export const uploadCommissionImage = async (file: File): Promise<string> => {
    // 壓縮 helper
    const compressImage = (sourceFile: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => { img.src = e.target?.result as string; };
            reader.onerror = () => reject(new Error("FileReader failed"));
            
            // 加入 FileReader 的安全超時 (防止壞檔讀取卡死)
            setTimeout(() => reject(new Error("Image read timeout")), 5000);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1200;

                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error("Canvas Context Error")); return; }
                
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Compression Failed"));
                }, 'image/jpeg', 0.7);
            };
            img.onerror = () => reject(new Error("Image load failed"));
        });
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    };

    try {
        // 1. 壓縮
        let blobToUpload: Blob;
        try {
            // 壓縮也限制時間
            blobToUpload = await withTimeout(compressImage(file), 8000, "Compression timeout");
            console.log(`Compressed: ${(blobToUpload.size / 1024).toFixed(2)} KB`);
        } catch (e) {
            console.warn("Compression failed/timed out, using original:", e);
            blobToUpload = file;
        }

        // 2. 上傳 (如果 storage 存在)
        if (storage) {
            try {
                const fileName = `commission_images/${Date.now()}_img.jpg`;
                const storageRef = ref(storage, fileName);
                
                // 強制上傳必須在 15 秒內完成
                const uploadTask = uploadBytes(storageRef, blobToUpload);
                const snapshot = await withTimeout(uploadTask, 15000, "Storage upload timeout");
                
                const downloadURL = await getDownloadURL(snapshot.ref);
                return downloadURL;
            } catch (error) {
                console.error("☁️ Storage 上傳失敗，轉為 Base64 儲存 (資料將直接寫入文件)", error);
                // 注意：這裡回傳 Base64 是可以的，因為這個字串會被存入 Firestore 的 thumbnailUrl 欄位
                // 只要 addCommissionToCloud 成功，管理員就能看到圖片
                return await blobToBase64(blobToUpload);
            }
        } else {
            return await blobToBase64(blobToUpload);
        }
    } catch (e) {
        console.error("Critical Image Error:", e);
        // 最後一道防線：回傳原始檔案 Base64
        try {
            return await blobToBase64(file);
        } catch {
            return "";
        }
    }
};

/**
 * 監聽委託單列表
 */
export const subscribeToCommissions = (callback: (commissions: Commission[]) => void) => {
  if (db) {
    const q = query(collection(db, COMMISSIONS_COLLECTION), orderBy("dateAdded", "desc"));
    let usingLocalListener = false;

    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      notifyStatus('connected');
      const commissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Commission[];
      callback(commissions);
    }, (error) => {
      handleFirebaseError(error);
      usingLocalListener = true;
      if (!commissionListeners.includes(callback)) commissionListeners.push(callback);
      callback(getLocalCommissions());
    });

    return () => {
      unsubscribeFirestore();
      if (usingLocalListener) commissionListeners = commissionListeners.filter(cb => cb !== callback);
    };
  } else {
    notifyStatus('offline');
    commissionListeners.push(callback);
    callback(getLocalCommissions());
    return () => commissionListeners = commissionListeners.filter(cb => cb !== callback);
  }
};

/**
 * 監聽全域設定
 */
export const subscribeToSettings = (callback: (settings: GlobalSettings) => void) => {
  if (db) {
    const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
    let usingLocalListener = false;

    const unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as GlobalSettings);
      } else {
        const defaultSettings: GlobalSettings = { isOpen: true, types: DEFAULT_COMMISSION_TYPES };
        setDoc(docRef, defaultSettings).catch(e => console.warn("Init settings error:", e));
        callback(defaultSettings);
      }
    }, (error) => {
      handleFirebaseError(error);
      usingLocalListener = true;
      if (!settingsListeners.includes(callback)) settingsListeners.push(callback);
      callback(getLocalSettings());
    });

    return () => {
        unsubscribeFirestore();
        if (usingLocalListener) settingsListeners = settingsListeners.filter(cb => cb !== callback);
    };
  } else {
    settingsListeners.push(callback);
    callback(getLocalSettings());
    return () => settingsListeners = settingsListeners.filter(cb => cb !== callback);
  }
};

/**
 * 新增委託單 (嚴格模式：失敗則拋出錯誤)
 */
export const addCommissionToCloud = async (commission: Commission) => {
  if (!db) {
      throw new Error("無法連線到資料庫 (Offline)");
  }
  
  // 增加超時時間至 15秒
  await withTimeout(
      setDoc(doc(db, COMMISSIONS_COLLECTION, commission.id), commission),
      15000,
      "Firestore write timeout (15s)"
  );
};

/**
 * 更新委託單
 */
export const updateCommissionInCloud = async (commission: Commission) => {
  if (!db) {
      throw new Error("無法連線到資料庫 (Offline)");
  }

  const docRef = doc(db, COMMISSIONS_COLLECTION, commission.id);
  await withTimeout(updateDoc(docRef, { ...commission }), 15000, "Update timeout");
};

/**
 * 刪除委託單
 */
export const deleteCommissionFromCloud = async (id: string) => {
  if (!db) {
      throw new Error("無法連線到資料庫 (Offline)");
  }
  await withTimeout(deleteDoc(doc(db, COMMISSIONS_COLLECTION, id)), 15000, "Delete timeout");
};

/**
 * 更新全域設定
 */
export const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
  if (!db) {
     console.warn("Offline: Cannot update settings to cloud");
     return;
  }
  
  try {
      const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
      await withTimeout(setDoc(docRef, settings, { merge: true }), 10000, "Settings update timeout");
  } catch(e) {
      console.error("Failed to update settings", e);
  }
};
