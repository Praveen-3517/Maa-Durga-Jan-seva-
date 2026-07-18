# Cyber Cafe Portal & WhatsApp Chatbot Setup Guide

This project is a complete, self-hosted web application for a **Cyber Cafe & Online Services Shop**. It provides a premium client-facing document upload portal, a single-admin dashboard to manage applications, an interactive **WhatsApp Bot Simulator** for testing, and an exportable **n8n Workflow** for actual WhatsApp API deployment.

---

## Features / विशेषताएँ
1. **Client Portal (ग्राहक पोर्टल)**: Customers can check required documents for services like PAN card, Voter ID, Income & Caste Certificates, and upload files directly.
2. **Admin Dashboard (एडमिन डैशबोर्ड)**: Shop owners can view all submissions, change status (Pending, In Progress, Completed), add remarks, and download files.
3. **WhatsApp Bot Simulator (व्हाट्सएप सिम्युलेटर)**: A built-in virtual mobile screen to test interactive menus and keywords like "Hi", "Shop Details", "Website Link", and auto-replies.
4. **n8n Workflow Integration (n8n वर्कफ़्लो)**: Exportable production-grade n8n JSON flow to configure a real automated chatbot on the Meta WhatsApp Cloud API with ₹0 monthly subscription fees!

---

## Quick Start (कैसे शुरू करें)

### Step 1: Install Dependencies
First, ensure you have [Node.js](https://nodejs.org/) installed. Extract the project files, open your terminal in the directory, and run:
```bash
npm install
```

### Step 2: Start the Web Server
Launch the server in development mode:
```bash
npm run dev
```
The application will launch on: **`http://localhost:3000`**

- **Customer Portal**: `http://localhost:3000/#portal`
- **WhatsApp Simulator**: `http://localhost:3000/#simulator`
- **Admin Dashboard**: `http://localhost:3000/#admin` (Default Password: `admin123`)

---

## Production Setup: WhatsApp Cloud API & n8n

Here is the step-by-step setup to connect this portal to a real WhatsApp number for customers.

### 1. Meta Developer Dashboard Setup (Meta सेटअप)
- Go to [Meta for Developers](https://developers.facebook.com/) and register.
- Create a new App -> select **Other** -> **Business** app type.
- Add the **WhatsApp** product to your app.
- Under WhatsApp -> **API Setup**:
  - Add your business phone number and verify it.
  - Copy your **Phone Number ID** and **WhatsApp Business Account ID**.
  - In Meta Settings, go to **System Users**, create an admin system user, and generate a **Permanent Access Token** (with `whatsapp_business_messaging` permissions). This token will never expire.

---

### 2. n8n Setup & Workflow Import (n8n सेटअप)
- Run a self-hosted `n8n` instance (e.g., using Docker or a cheap VPS like Render, DigitalOcean, or Railway for ₹400-500/month).
- Download the `n8n_whatsapp_workflow.json` from the Admin page of this web application (or find it in `public/n8n_whatsapp_workflow.json`).
- Open your n8n workspace, click **Import from File** from the top right settings menu, and upload the JSON file.
- The pre-built nodes (Webhook, Verification IF-else, Switch parser, and HTTP requests) will be displayed.

---

### 3. Connect n8n to Meta API (n8n को Meta से जोड़ें)
1. **Webhook Configuration**:
   - Double-click the **Webhook** node in n8n.
   - Copy the **Production Webhook URL** (e.g. `https://your-n8n.com/webhook/whatsapp-webhook`).
   - Go back to the Meta Developer Dashboard -> WhatsApp -> **Configuration**:
     - Click **Edit** next to Webhook URL.
     - Paste your n8n Webhook URL.
     - Add a Verification Token (e.g., `cybercafe_token` or any custom string).
     - Save it, and click **Verify and Save**.
     - Under Webhook Fields, click **Manage** and subscribe to **`messages`**.
2. **HTTP Node Updates**:
   - In n8n, open each of the HTTP Request nodes (`Send PAN Info`, `Send Welcome List Menu`, etc.).
   - Replace the URL's `YOUR_PHONE_NUMBER_ID` placeholder with your actual Meta Phone Number ID.
   - Update the `Authorization` header by replacing `YOUR_PERMANENT_ACCESS_TOKEN` with your actual Meta System User token (keep the prefix `Bearer ` intact).
   - In the JSON body payload, replace the website URL `https://www.yourcybercafewebsite.com` with the actual public URL of this deployed website.
3. **Save and Activate**:
   - Click **Save** in n8n and toggle the workflow active from the top right.

---

## हिन्दी सेटअप गाइड (n8n & WhatsApp Cloud API)

1. **Meta (Facebook) Account Setup**:
   - `developers.facebook.com` पर जाएं, 'My Apps' में जाकर एक **Business App** बनाएं।
   - **WhatsApp Business Platform** को सेट-अप करें। यहाँ अपना नंबर वेरीफाई करें।
   - यहाँ से **Phone Number ID** और **Permanent Access Token** (System Users में जाकर) कॉपी कर लें।

2. **n8n में Workflow Import करें**:
   - अपने n8n इंस्टेंस पर जाएं। 'Settings' से 'Import from File' चुनें और `n8n_whatsapp_workflow.json` को सेलेक्ट करें।
   - आपके सामने पूरा फ्लो चार्ट आ जायेगा। 

3. **URL और Token अपडेट करें**:
   - n8n में मौजूद सभी `HTTP Request` नोड्स को खोलें। 
   - `https://graph.facebook.com/v20.0/YOUR_PHONE_NUMBER_ID/messages` में `YOUR_PHONE_NUMBER_ID` की जगह अपना रियल Phone Number ID डालें।
   - `Headers` में `Authorization` की वैल्यू `Bearer YOUR_PERMANENT_ACCESS_TOKEN` में अपना नया जनरेट किया हुआ टोकन डालें।
   - मैसेज बॉडी में अपनी दुकान की वेबसाइट का असली लिंक बदलें (जैसे: `👉 https://apna-cybercafe.com`).

4. **Webhook चालू करें**:
   - n8n Webhook नोड का URL कॉपी करें (Production URL).
   - Facebook Developer Portal के WhatsApp Configuration सेक्शन में जाकर इसे पेस्ट करें। 
   - Verify Token में कोई भी नाम (जैसे `cybercafe_token`) डालें और n8n में भी IF कंडीशन में उसे अपडेट कर सकते हैं।
   - इसके बाद Meta Dashboard में **messages** फ़ील्ड को 'Subscribe' करना न भूलें।

अब आपका WhatsApp chatbot और Document upload website पूरी तरह से लाइव काम करेंगे!
