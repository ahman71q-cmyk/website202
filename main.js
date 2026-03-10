// ==================== إعدادات Supabase ====================
// ==================== إعدادات Supabase ====================
const supabaseUrl = 'https://lpigzuymmzisrawmfcuq.supabase.co';
const supabaseKey = 'sb_publishable_vQ6Eh--B3jrQXgP_q3iN6Q_uv1m3k0G';

// استخدم window.supabase عشان متعملش conflict
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
// استخدم supabaseClient بدل supabase في كل الكود
// ==================== إعدادات Supabase ====================

// ⚠️ سطر مهم جداً - عشان الـ Console
window.supabase = supabaseClient;

// ==================== البيانات ====================
// ملاحظة: البيانات هتتحمّل من Supabase بدلاً من localStorage
let users = [];
let tasks = [];
let messages = [];

// متغيرات عامة
let nextTaskId = 100; // هيتحدد بعد التحميل من الداتا بيز
let nextUserId = 100;
let nextMessageId = 100;
let currentSection = 'dashboard';
let messagesVisible = false;
let messagesContentVisible = false;
let selectedTaskForDescription = null;
let currentChatUserId = null;

let currentUser = null; // هيتحمّل من الجلسة

// ==================== تحميل البيانات من Supabase ====================
async function loadDataFromSupabase() {
    try {
        // تحميل المستخدمين
        const {  usersData, error: usersError } = await supabaseClient
            .from('user')
            .select('*')
            .order('id');
        if (usersError) throw usersError;
        users = usersData || [];
        
        // تحديث nextUserId
        if (users.length > 0) {
            nextUserId = Math.max(...users.map(u => u.id)) + 1;
        }

        // تحميل المهام
        const {  tasksData, error: tasksError } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('id');
        if (tasksError) throw tasksError;
        tasks = tasksData || [];
        
        // تحديث nextTaskId
        if (tasks.length > 0) {
            nextTaskId = Math.max(...tasks.map(t => t.id)) + 1;
        }

        // تحميل الرسائل
        const {  messagesData, error: messagesError } = await supabaseClient
            .from('messages')
            .select('*')
            .order('time');
        if (messagesError) throw messagesError;
        messages = messagesData || [];
        
        // تحديث nextMessageId
        if (messages.length > 0) {
            nextMessageId = Math.max(...messages.map(m => m.id)) + 1;
        }

        // تحميل المستخدم الحالي من الجلسة
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            // التحقق من وجود المستخدم في الداتا بيز
            const {  verifiedUser } = await supabaseClient
                .from('user')
                .select('*')
                .eq('id', currentUser.id)
                .single();
            if (!verifiedUser) {
                currentUser = null;
                localStorage.removeItem('currentUser');
            }
        }

        console.log('✅ تم تحميل البيانات من Supabase');
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        alert('حدث خطأ في الاتصال بقاعدة البيانات');
    }
}

// ==================== دوال حفظ البيانات في Supabase ====================

// تحديث مهمة
async function updateTaskInDB(taskId, updates) {
    const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);
    if (error) {
        console.error('Error updating task:', error);
        return false;
    }
    // تحديث الـ local array
    const task = tasks.find(t => t.id === taskId);
    if (task) Object.assign(task, updates);
    return true;
}

// إضافة رسالة
async function saveMessageToDB(messageData) {
    const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select();
    if (error) {
        console.error('Error saving message:', error);
        return null;
    }
    messages.push(data[0]);
    return data[0];
}

// تحديث حالة الرسالة (مقروءة)
async function markMessagesReadInDB(messageIds) {
    const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .in('id', messageIds);
    if (error) console.error('Error marking messages read:', error);
    // تحديث الـ local array
    messages.forEach(m => {
        if (messageIds.includes(m.id)) m.read = true;
    });
}

// إضافة مستخدم
async function addUserToDB(userData) {
    const { data, error } = await supabase
        .from('user')
        .insert([{
            name: userData.name,
            password: userData.password,
            is_admin: false
        }])
        .select();
    if (error) {
        console.error('Error adding user:', error);
        return null;
    }
    users.push(data[0]);
    return data[0];
}

// حذف مستخدم
async function deleteUserFromDB(userId) {
    const { error } = await supabase
        .from('user')
        .delete()
        .eq('id', userId);
    if (error) {
        console.error('Error deleting user:', error);
        return false;
    }
    users = users.filter(u => u.id !== userId);
    return true;
}

// تحديث مستخدم
async function updateUserInDB(userId, newData) {
    const { error } = await supabase
        .from('user')
        .update(newData)
        .eq('id', userId);
    if (error) {
        console.error('Error updating user:', error);
        return false;
    }
    const user = users.find(u => u.id === userId);
    if (user) Object.assign(user, newData);
    return true;
}

// إضافة مهمة
async function addTaskToDB(taskData) {
    const { data, error } = await supabase
        .from('tasks')
        .insert([{
            title: taskData.title,
            refs: taskData.refs,
            description: taskData.description,
            status: "لم تبدأ"
        }])
        .select();
    if (error) {
        console.error('Error adding task:', error);
        return null;
    }
    tasks.push(data[0]);
    return data[0];
}

// حذف مهمة
async function deleteTaskFromDB(taskId) {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
    if (error) {
        console.error('Error deleting task:', error);
        return false;
    }
    tasks = tasks.filter(t => t.id !== taskId);
    return true;
}

// تعيين مهمة لمستخدم (في جدول user_tasks)
async function assignTaskToUserInDB(userId, taskId) {
    const { error } = await supabase
        .from('user_tasks')
        .insert([{ user_id: userId, task_id: taskId }]);
    if (error) {
        console.error('Error assigning task:', error);
        return false;
    }
    // تحديث الـ local array
    const user = users.find(u => u.id === userId);
    if (user) {
        if (!user.tasks) user.tasks = [];
        if (!user.tasks.includes(taskId)) user.tasks.push(taskId);
    }
    return true;
}

// ==================== دوال تسجيل الدخول (محدثة) ====================

// دالة تسجيل الدخول
async function login(username, password) {
    try {
        const { data, error } = await supabase
            .from('user')
            .select('*')
            .eq('name', username)
            .eq('password', password)
            .single();
        
        if (error || !data) {
            return false;
        }
        
        currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('messagesPanel').style.display = 'block';
        updateUnreadCount();
        
        if (currentUser.is_admin) {
            showAdminDashboard();
        } else {
            showUserPage();
        }
        return true;
    } catch (err) {
        console.error('Login error:', err);
        return false;
    }
}

// دالة تسجيل الخروج
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById('messagesPanel').style.display = 'none';
    showLoginPage();
}

// ==================== دوال الرسائل (محدثة) ====================

async function sendMessage() {
    const messageText = document.getElementById('newMessage').value.trim();
    if (!messageText || !currentUser) {
        console.error('❌ No message text or no current user');
        alert('الرجاء كتابة رسالة أولاً');
        return;
    }

    console.log('📤 Current User:', currentUser);
    console.log('📤 Message Text:', messageText);

    // تحديد المستقبل
    const recipientId = currentUser.is_admin ? 
        (currentChatUserId || 15) : 15;

    const newMessage = {
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        recipient_id: recipientId,
        text: messageText,
        time: new Date().toISOString(),
        read: false
    };

    console.log('📤 Sending Message:', newMessage);

    try {
        const { data, error } = await supabase
            .from('messages')
            .insert([newMessage])
            .select();

        if (error) {
            console.error('❌ Error saving message:', error);
            alert('حدث خطأ في إرسال الرسالة: ' + error.message);
            return;
        }

        console.log('✅ Message sent successfully:', data);

        // تحديث القائمة المحلية
        if (data && data[0]) {
            messages.push(data[0]);
        }

        // مسح حقل الرسالة
        document.getElementById('newMessage').value = '';
        
        // تحديث الواجهة
        if (currentUser.is_admin && currentChatUserId) {
            showChatWithUser(currentChatUserId);
        } else {
            showMessages();
        }
        
        updateUnreadCount();
    } catch (err) {
        console.error('❌ Exception in sendMessage:', err);
        alert('حدث خطأ غير متوقع: ' + err.message);
    }
}


function getUnreadCount() {
    if (!currentUser) return 0;
    
    if (currentUser.is_admin) {
        return messages.filter(m => m.recipient_id === 15 && !m.read).length;
    } else {
        return messages.filter(m => m.recipient_id === currentUser.id && !m.read).length;
    }
}

function updateUnreadCount() {
    const count = getUnreadCount();
    const unreadElement = document.getElementById('unreadCount');
    if (unreadElement) {
        unreadElement.textContent = count;
        unreadElement.style.display = count > 0 ? 'inline' : 'none';
    }
}

async function markMessagesAsRead(userId) {
    const unreadMessages = messages.filter(m => 
        (m.recipient_id === userId || (m.sender_id === userId && m.recipient_id === currentUser?.id)) && !m.read
    );
    
    if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(m => m.id);
        await markMessagesReadInDB(messageIds);
    }
    
    updateUnreadCount();
}

function toggleMessages() {
    messagesContentVisible = !messagesContentVisible;
    const content = document.getElementById('messagesContent');
    const input = document.getElementById('messageInput');
    
    if (content) content.style.display = messagesContentVisible ? 'block' : 'none';
    if (input) input.style.display = messagesContentVisible ? 'flex' : 'none';
    
    if (messagesContentVisible) {
        if (currentUser?.is_admin) {
            showUserList();
        } else {
            showMessages();
        }
    }
}

function showUserList() {
    const content = document.getElementById('messagesContent');
    if (!content) return;
    
    let html = '<div style="padding: 10px;">';
    
    users.filter(u => !u.is_admin).forEach(u => {
        const unreadFromUser = messages.filter(m => m.sender_id === u.id && !m.read).length;
        html += `
            <div onclick="showChatWithUser(${u.id})" style="
                padding: 10px;
                margin: 5px 0;
                background: rgba(0,168,255,0.1);
                border-radius: 10px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span>${u.name}</span>
                ${unreadFromUser > 0 ? `<span class="unread-badge">${unreadFromUser}</span>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
}

async function showChatWithUser(userId) {
    currentChatUserId = userId;
    const user = users.find(u => u.id === userId);
    const content = document.getElementById('messagesContent');
    
    if (!content || !user) return;
    
    await markMessagesAsRead(userId);
    
    let html = `<div style="padding: 10px;">
        <div onclick="showUserList()" style="
            padding: 5px;
            margin-bottom: 10px;
            background: #00a8ff;
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
        ">🔙 رجوع</div>
    `;
    
    const chatMessages = messages.filter(m => 
        (m.sender_id === currentUser.id && m.recipient_id === userId) ||
        (m.sender_id === userId && m.recipient_id === currentUser.id)
    ).sort((a, b) => new Date(a.time) - new Date(b.time));
    
    chatMessages.forEach(m => {
        const messageClass = m.sender_id === currentUser.id ? 'sent' : 'received';
        html += `
            <div class="message ${messageClass}">
                <div class="sender">${m.sender_name || 'Unknown'}</div>
                <div>${m.text}</div>
                <div class="time">${new Date(m.time).toLocaleString('ar-EG')}</div>
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
    
    setTimeout(() => {
        content.scrollTop = content.scrollHeight;
    }, 100);
}

async function showMessages() {
    if (!currentUser) return;
    
    const content = document.getElementById('messagesContent');
    if (!content) return;
    
    let html = '';
    
    const userMessages = messages.filter(m => 
        m.sender_id === currentUser.id || m.recipient_id === currentUser.id
    ).sort((a, b) => new Date(a.time) - new Date(b.time));
    
    await markMessagesAsRead(currentUser.id);
    
    userMessages.forEach(m => {
        const messageClass = m.sender_id === currentUser.id ? 'sent' : 'received';
        html += `
            <div class="message ${messageClass}">
                <div class="sender">${m.sender_name || 'Unknown'}</div>
                <div>${m.text}</div>
                <div class="time">${new Date(m.time).toLocaleString('ar-EG')}</div>
            </div>
        `;
    });
    
    if (html === '') {
        html = '<div style="text-align: center; color: #888; padding: 20px;">لا توجد رسائل بعد</div>';
    }
    
    content.innerHTML = html;
    
    setTimeout(() => {
        content.scrollTop = content.scrollHeight;
    }, 100);
}

// ==================== دوال المستخدمين (محدثة) ====================

async function addUser(userData) {
    return await addUserToDB(userData);
}

async function deleteUser(userId) {
    if (userId === 15) {
        alert('لا يمكن حذف المدير');
        return false;
    }
    return await deleteUserFromDB(userId);
}

async function updateUser(userId, newData) {
    return await updateUserInDB(userId, newData);
}

// ==================== دوال المهام (محدثة) ====================

async function addTask(taskData) {
    return await addTaskToDB(taskData);
}

async function deleteTask(taskId) {
    return await deleteTaskFromDB(taskId);
}

async function updateTask(taskId, newData) {
    return await updateTaskInDB(taskId, newData);
}

async function assignTaskToUser(taskId, userId) {
    return await assignTaskToUserInDB(userId, taskId);
}

// ==================== تحديث حالة المهمة (محدثة) ====================

async function updateTaskStatus(taskId, newStatus) {
    const success = await updateTaskInDB(taskId, { status: newStatus });
    if (success) {
        const task = tasks.find(t => t.id === taskId);
        if (task) task.status = newStatus;
        return true;
    }
    return false;
}

// ==================== دوال عرض شرح المهمة (نفس الكود القديم) ====================

function showTaskDescription(taskId) {
    selectedTaskForDescription = taskId;
    if (currentUser?.is_admin) {
        if (currentSection === 'tasks') {
            showTaskManagement();
        }
    } else {
        showUserPage();
    }
}

function closeTaskDescription() {
    selectedTaskForDescription = null;
    if (currentUser?.is_admin) {
        if (currentSection === 'tasks') {
            showTaskManagement();
        }
    } else {
        showUserPage();
    }
}

// ==================== عرض صفحات الموقع ====================

function showLoginPage() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <div class="login-container">
            <h2>🔐 تسجيل الدخول</h2>
            <input type="text" id="username" placeholder="اسم المستخدم" autocomplete="off">
            <input type="password" id="password" placeholder="الرقم السري">
            <button onclick="handleLogin()">دخول ⚡</button>
            <p id="error" style="color:#ff6b6b; margin-top:15px;"></p>
        </div>
    `;
}

async function showUserPage() {
    const app = document.getElementById('app');
    if (!app || !currentUser) return;
    
    // تحميل مهام المستخدم من جدول user_tasks
    const {  userTasksData } = await supabase
        .from('user_tasks')
        .select('task_id')
        .eq('user_id', currentUser.id);
    
    const userTaskIds = userTasksData ? userTasksData.map(ut => ut.task_id) : [];
    const userTasks = tasks.filter(t => userTaskIds.includes(t.id));
    
    // عرض شرح المهمة المحددة
    let descriptionHtml = '';
    if (selectedTaskForDescription) {
        const task = tasks.find(t => t.id === selectedTaskForDescription);
        if (task && userTaskIds.includes(task.id)) {
            descriptionHtml = `
                <div class="task-description-box">
                    <h3>📖 شرح المهمة: ${task.title}</h3>
                    <p>${task.description || 'لا يوجد شرح لهذه المهمة'}</p>
                    <button class="close-btn" onclick="closeTaskDescription()">إغلاق</button>
                </div>
            `;
        } else {
            selectedTaskForDescription = null;
        }
    }
    
    let tasksHtml = '';
    userTasks.forEach(t => {
        const statusClass = t.status === 'تمت' ? 'status-done' : 'status-pending';
        tasksHtml += `<tr>
            <td>${t.id}</td>
            <td>
                ${t.title}
                <button class="edit-btn" onclick="showTaskDescription(${t.id})" style="font-size: 10px; padding: 2px 5px; background: #00a8ff;">📖 شرح</button>
            </td>
            <td>
                <select class="status-select" onchange="changeUserTaskStatus(${t.id}, this.value)">
                    <option value="لم تبدأ" ${t.status === 'لم تبدأ' ? 'selected' : ''}>لم تبدأ</option>
                    <option value="قيد التنفيذ" ${t.status === 'قيد التنفيذ' ? 'selected' : ''}>قيد التنفيذ</option>
                    <option value="تمت" ${t.status === 'تمت' ? 'selected' : ''}>تمت</option>
                </select>
            </td>
            <td>${t.refs}</td>
        </tr>`;
    });

    app.innerHTML = `
        <div class="container">
            <div class="header">
                <h2>👋 مرحباً ${currentUser.name}</h2>
                <button class="logout-btn" onclick="logout()">خروج من الشبكة 🚪</button>
            </div>
            
            <div class="tasks-summary">
                <p>📋 مهامك في شبكة 5G: <span>${userTasks.length}</span></p>
            </div>

            ${descriptionHtml}

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>الموضوع</th>
                        <th>الحالة</th>
                        <th>الأرقام المرجعية</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasksHtml || '<tr><td colspan="4">لا توجد مهام مخصصة لك</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

async function showAdminDashboard() {
    const app = document.getElementById('app');
    if (!app) return;
    
    currentSection = 'dashboard';
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'تمت').length;
    const pendingTasks = tasks.filter(t => t.status !== 'تمت').length;
    const totalUsers = users.filter(u => !u.is_admin).length;

    // تحميل تعيينات المهام من جدول user_tasks
    const {  userTasksData } = await supabase
        .from('user_tasks')
        .select('*');
    
    let tasksHtml = '';
    tasks.forEach(t => {
        const assignedUserIds = userTasksData ? userTasksData.filter(ut => ut.task_id === t.id).map(ut => ut.user_id) : [];
        const assignedUsers = users.filter(u => assignedUserIds.includes(u.id)).map(u => u.name).join('، ') || 'غير معين';
        const statusClass = t.status === 'تمت' ? 'status-done' : 'status-pending';
        
        tasksHtml += `<tr>
            <td>${t.id}</td>
            <td>${t.title}</td>
            <td class="${statusClass}">${t.status}</td>
            <td>${t.refs}</td>
            <td>${assignedUsers}</td>
            <td>
                <select class="status-select" onchange="changeStatus(${t.id}, this.value)">
                    <option value="لم تبدأ" ${t.status === 'لم تبدأ' ? 'selected' : ''}>لم تبدأ</option>
                    <option value="قيد التنفيذ" ${t.status === 'قيد التنفيذ' ? 'selected' : ''}>قيد التنفيذ</option>
                    <option value="تمت" ${t.status === 'تمت' ? 'selected' : ''}>تمت</option>
                </select>
            </td>
        </tr>`;
    });

    app.innerHTML = `
        <div class="container dashboard">
            <div class="header">
                <h2>👑 لوحة تحكم شبكة 5G</h2>
                <button class="logout-btn" onclick="logout()">خروج من الشبكة 🚪</button>
            </div>

            <div class="nav-menu">
                <button class="nav-btn active" onclick="showAdminDashboard()">📊 الرئيسية</button>
                <button class="nav-btn" onclick="showUserManagement()">👥 إدارة المستخدمين</button>
                <button class="nav-btn" onclick="showTaskManagement()">📋 إدارة المهام</button>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <h3>إجمالي المهام</h3>
                    <p class="stat-number">${totalTasks}</p>
                </div>
                <div class="stat-card">
                    <h3>المهام المنجزة</h3>
                    <p class="stat-number">${completedTasks}</p>
                </div>
                <div class="stat-card">
                    <h3>المهام قيد التنفيذ</h3>
                    <p class="stat-number">${pendingTasks}</p>
                </div>
                <div class="stat-card">
                    <h3>عدد المستخدمين</h3>
                    <p class="stat-number">${totalUsers}</p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>الموضوع</th>
                        <th>الحالة</th>
                        <th>الأرقام المرجعية</th>
                        <th>المسؤول</th>
                        <th>تحديث الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasksHtml}
                </tbody>
            </table>
        </div>
    `;
}

async function showUserManagement() {
    const app = document.getElementById('app');
    if (!app) return;
    
    currentSection = 'users';
    
    let usersHtml = '';
    users.filter(u => !u.is_admin).forEach(u => {
        usersHtml += `<tr>
            <td>${u.id}</td>
            <td>${u.name}</td>
            <td>${u.password}</td>
            <td>-</td>
            <td>
                <button class="edit-btn" onclick="editUser(${u.id})">✏️ تعديل</button>
                <button class="delete-btn" onclick="deleteUserHandler(${u.id})">🗑️ حذف</button>
                <button class="message-btn" onclick="showChatWithUser(${u.id})">📨 محادثة</button>
            </td>
        </tr>`;
    });

    app.innerHTML = `
        <div class="container">
            <div class="header">
                <h2>👥 إدارة المستخدمين</h2>
                <button class="logout-btn" onclick="logout()">خروج من الشبكة 🚪</button>
            </div>

            <div class="nav-menu">
                <button class="nav-btn" onclick="showAdminDashboard()">📊 الرئيسية</button>
                <button class="nav-btn active" onclick="showUserManagement()">👥 إدارة المستخدمين</button>
                <button class="nav-btn" onclick="showTaskManagement()">📋 إدارة المهام</button>
            </div>

            <div class="add-form">
                <h3>➕ إضافة مستخدم جديد</h3>
                <div class="form-row">
                    <input type="text" id="newUserName" placeholder="اسم المستخدم">
                    <input type="password" id="newUserPassword" placeholder="الرقم السري">
                    <button onclick="addUserHandler()">إضافة مستخدم</button>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>الاسم</th>
                        <th>الرقم السري</th>
                        <th>عدد المهام</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersHtml}
                </tbody>
            </table>
        </div>
    `;
}

async function showTaskManagement() {
    const app = document.getElementById('app');
    if (!app) return;
    
    currentSection = 'tasks';
    
    // تحميل تعيينات المهام
    const {  userTasksData } = await supabase
        .from('user_tasks')
        .select('*');
    
    let tasksHtml = '';
    tasks.forEach(t => {
        const assignedUserIds = userTasksData ? userTasksData.filter(ut => ut.task_id === t.id).map(ut => ut.user_id) : [];
        const assignedUsers = users.filter(u => assignedUserIds.includes(u.id)).map(u => u.name).join('، ') || 'غير معين';
        
        tasksHtml += `<tr>
            <td>${t.id}</td>
            <td>${t.title}</td>
            <td>${t.refs}</td>
            <td>${t.status}</td>
            <td>${assignedUsers}</td>
            <td>
                <button class="edit-btn" onclick="editTask(${t.id})">✏️ تعديل</button>
                <button class="delete-btn" onclick="deleteTaskHandler(${t.id})">🗑️ حذف</button>
                <button class="edit-btn" onclick="assignTask(${t.id})">👥 تعيين</button>
                <button class="edit-btn" onclick="showTaskDescription(${t.id})">📖 عرض الشرح</button>
            </td>
        </tr>`;
    });

    // عرض شرح المهمة المحددة
    let descriptionHtml = '';
    if (selectedTaskForDescription) {
        const task = tasks.find(t => t.id === selectedTaskForDescription);
        if (task) {
            descriptionHtml = `
                <div class="task-description-box">
                    <h3>📖 شرح المهمة: ${task.title}</h3>
                    <p>${task.description || 'لا يوجد شرح لهذه المهمة'}</p>
                    <button onclick="editTaskDescription(${task.id})" style="background: #f39c12; color: white; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; margin-left: 10px;">✏️ تعديل الشرح</button>
                    <button class="close-btn" onclick="closeTaskDescription()">إغلاق</button>
                </div>
            `;
        }
    }

    app.innerHTML = `
        <div class="container">
            <div class="header">
                <h2>📋 إدارة المهام</h2>
                <button class="logout-btn" onclick="logout()">خروج من الشبكة 🚪</button>
            </div>

            <div class="nav-menu">
                <button class="nav-btn" onclick="showAdminDashboard()">📊 الرئيسية</button>
                <button class="nav-btn" onclick="showUserManagement()">👥 إدارة المستخدمين</button>
                <button class="nav-btn active" onclick="showTaskManagement()">📋 إدارة المهام</button>
            </div>

            <div class="add-form">
                <h3>➕ إضافة مهمة جديدة</h3>
                <div class="form-row">
                    <input type="text" id="newTaskTitle" placeholder="عنوان المهمة">
                    <input type="text" id="newTaskRefs" placeholder="الأرقام المرجعية">
                    <textarea id="newTaskDescription" placeholder="شرح المهمة" rows="3"></textarea>
                    <button onclick="addTaskHandler()">إضافة مهمة</button>
                </div>
            </div>

            ${descriptionHtml}

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>العنوان</th>
                        <th>الأرقام المرجعية</th>
                        <th>الحالة</th>
                        <th>المسؤولون</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasksHtml}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== دوال المعالجة (محدثة) ====================

window.handleLogin = async function() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (await login(username, password)) {
        // تم تسجيل الدخول بنجاح
    } else {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.innerText = '❌ اسم المستخدم أو الرقم السري خطأ';
        }
    }
};

window.changeStatus = async function(taskId, newStatus) {
    if (await updateTaskStatus(taskId, newStatus)) {
        showAdminDashboard();
    }
};

window.changeUserTaskStatus = async function(taskId, newStatus) {
    if (await updateTaskStatus(taskId, newStatus)) {
        showUserPage();
    }
};

window.addUserHandler = async function() {
    const name = document.getElementById('newUserName').value.trim();
    const password = document.getElementById('newUserPassword').value.trim();
    
    if (name && password) {
        await addUser({ name, password });
        showUserManagement();
    } else {
        alert('الرجاء إدخال جميع البيانات');
    }
};

window.deleteUserHandler = async function(userId) {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        if (await deleteUser(userId)) {
            showUserManagement();
        }
    }
};

window.editUser = async function(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const newName = prompt('أدخل الاسم الجديد:', user.name);
    const newPassword = prompt('أدخل الرقم السري الجديد:', user.password);
    
    if (newName && newPassword) {
        await updateUser(userId, { name: newName, password: newPassword });
        showUserManagement();
    }
};

window.addTaskHandler = async function() {
    const title = document.getElementById('newTaskTitle').value.trim();
    const refs = document.getElementById('newTaskRefs').value.trim();
    const description = document.getElementById('newTaskDescription').value.trim();
    
    if (title && refs) {
        await addTask({ title, refs, description });
        showTaskManagement();
    } else {
        alert('الرجاء إدخال جميع البيانات');
    }
};

window.deleteTaskHandler = async function(taskId) {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
        if (await deleteTask(taskId)) {
            if (selectedTaskForDescription === taskId) {
                selectedTaskForDescription = null;
            }
            showTaskManagement();
        }
    }
};

window.editTask = async function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newTitle = prompt('أدخل العنوان الجديد:', task.title);
    const newRefs = prompt('أدخل الأرقام المرجعية الجديدة:', task.refs);
    
    if (newTitle && newRefs) {
        await updateTask(taskId, { title: newTitle, refs: newRefs });
        showTaskManagement();
    }
};

window.editTaskDescription = async function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newDescription = prompt('أدخل الشرح الجديد للمهمة:', task.description || '');
    
    if (newDescription !== null) {
        await updateTask(taskId, { description: newDescription });
        selectedTaskForDescription = taskId;
        showTaskManagement();
    }
};

window.assignTask = async function(taskId) {
    const availableUsers = users.filter(u => !u.is_admin);
    let userList = 'اختر المستخدم:\n';
    availableUsers.forEach((u, index) => {
        userList += `${index + 1}. ${u.name}\n`;
    });
    
    const choice = prompt(userList + 'أدخل رقم المستخدم:');
    const userIndex = parseInt(choice) - 1;
    
    if (userIndex >= 0 && userIndex < availableUsers.length) {
        const userId = availableUsers[userIndex].id;
        await assignTaskToUser(taskId, userId);
        showTaskManagement();
    }
};

window.showTaskDescription = function(taskId) {
    selectedTaskForDescription = taskId;
    if (currentUser?.is_admin) {
        showTaskManagement();
    } else {
        showUserPage();
    }
};

window.closeTaskDescription = function() {
    selectedTaskForDescription = null;
    if (currentUser?.is_admin) {
        showTaskManagement();
    } else {
        showUserPage();
    }
};

window.logout = logout;
window.toggleMessages = toggleMessages;
window.sendMessage = sendMessage;

// ==================== تشغيل الموقع ====================
document.addEventListener('DOMContentLoaded', async () => {
    // تحميل البيانات من Supabase أولاً
    await loadDataFromSupabase();
    
    // ثم عرض الصفحة المناسبة
    if (currentUser) {
        const messagesPanel = document.getElementById('messagesPanel');
        if (messagesPanel) {
            messagesPanel.style.display = 'block';
        }
        updateUnreadCount();
        if (currentUser.is_admin) {
            showAdminDashboard();
        } else {
            showUserPage();
        }
    } else {
        showLoginPage();
    }
});

// تحديث عدد الرسائل كل 5 ثواني
setInterval(updateUnreadCount, 5000);









// تأكد من المتغيرات الأساسية
// console.log('✅ Supabase URL:', typeof supabaseUrl !== 'undefined' ? supabaseUrl : 'NOT DEFINED');
// console.log('✅ Supabase Key:', typeof supabaseKey !== 'undefined' ? supabaseKey : 'NOT DEFINED');
// console.log('✅ Supabase Client:', typeof supabase !== 'undefined' ? 'DEFINED' : 'NOT DEFINED');



// تأكد إن Supabase متصل
// console.log('URL:', supabaseUrl);
// console.log('Key:', supabaseKey);
// console.log('Client:', supabaseClient);

// جرب تجيب المستخدمين
// const {  data, error } = await supabaseClient.from('user').select('*');
// console.log('✅ Users:', data);
// console.log('❌ Error:', error);