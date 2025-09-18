# Microsoft Translator API Setup Guide

This guide will help you set up Microsoft Translator API for the NeuroLearn translation feature.

## Prerequisites

- An Azure account (free tier available)
- Access to Azure Portal

## Step 1: Create Azure Account

1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign up for a free account if you don't have one
3. Azure provides $200 in free credits for new users

## Step 2: Create Translator Resource

1. **Login to Azure Portal**
   - Navigate to [Azure Portal](https://portal.azure.com/)
   - Sign in with your Azure account

2. **Create New Resource**
   - Click "Create a resource" (+ icon)
   - Search for "Translator"
   - Select "Translator" from Microsoft

3. **Configure Translator Resource**
   - **Subscription**: Select your Azure subscription
   - **Resource Group**: Create new or select existing
   - **Region**: Choose a region close to your users (e.g., East US, West Europe)
   - **Name**: Give your translator resource a unique name
   - **Pricing Tier**: 
     - **Free (F0)**: 2M characters/month free
     - **Standard (S1)**: Pay-as-you-go pricing

4. **Review and Create**
   - Review your settings
   - Click "Create"
   - Wait for deployment to complete

## Step 3: Get API Credentials

1. **Navigate to Your Resource**
   - Go to "All resources" in Azure Portal
   - Click on your Translator resource

2. **Get Keys and Endpoint**
   - In the left sidebar, click "Keys and Endpoint"
   - Copy the following information:
     - **Key 1** (or Key 2)
     - **Endpoint** (should be `https://api.cognitive.microsofttranslator.com/`)
     - **Location/Region** (e.g., `eastus`, `westeurope`)

## Step 4: Configure Environment Variables

1. **Update .env File**
   Open your `.env` file in the project root and update these values:

   ```env
   # Microsoft Translator API Configuration
   MICROSOFT_TRANSLATOR_KEY=your-actual-api-key-here
   MICROSOFT_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com/
   MICROSOFT_TRANSLATOR_REGION=your-region-here
   ```

2. **Replace Placeholder Values**
   - Replace `your-actual-api-key-here` with Key 1 from Azure Portal
   - Replace `your-region-here` with your resource's region (e.g., `eastus`)

## Step 5: Test the Integration

1. **Restart Development Server**
   ```bash
   npm run dev
   ```

2. **Test Translation**
   - Open your application
   - Navigate to a notebook with messages
   - Try translating a message to different languages
   - Check browser console for any errors

## Pricing Information

### Free Tier (F0)
- **2 million characters per month** free
- Perfect for development and small applications
- No additional costs

### Standard Tier (S1)
- **$10 per million characters**
- Pay only for what you use
- No monthly commitment
- Suitable for production applications

## Supported Languages

Microsoft Translator supports 100+ languages including:
- **European**: English, Spanish, French, German, Italian, Portuguese, Russian
- **Asian**: Chinese (Simplified/Traditional), Japanese, Korean, Hindi, Arabic
- **And many more**: See [full language list](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/language-support)

## Troubleshooting

### Common Issues

1. **"Invalid Microsoft Translator API key" Error**
   - Verify your API key is correct
   - Ensure no extra spaces in the .env file
   - Try using Key 2 if Key 1 doesn't work

2. **"Access denied" Error**
   - Check if your region is correctly set
   - Verify your Azure subscription is active
   - Ensure the Translator resource is properly deployed

3. **"Rate limit exceeded" Error**
   - You've exceeded your monthly quota
   - Upgrade to Standard tier or wait for next month

4. **"Service temporarily unavailable" Error**
   - Check Azure service status
   - Verify your internet connection
   - Try again after a few minutes

### Getting Help

- [Azure Translator Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/)
- [Azure Support](https://azure.microsoft.com/en-us/support/)
- Check Azure Portal for service health status

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables for all sensitive data**
3. **Rotate API keys regularly**
4. **Monitor usage in Azure Portal**
5. **Set up billing alerts to avoid unexpected charges**

---

**Note**: The free tier provides 2 million characters per month, which should be sufficient for most development and small-scale production use cases.