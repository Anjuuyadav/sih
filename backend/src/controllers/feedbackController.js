const axios = require('axios');

const submitFeedback = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Feedback text is required'
            });
        }

        const response = await axios.post(
            'http://127.0.0.1:5001/predict',
            { text: text.trim() }
        );

        return res.status(200).json({
            success: true,
            feedback: text.trim(),
            sentiment: response.data.sentiment,
            confidence: response.data.confidence
        });

    } catch (error) {
        console.error('AI feedback error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to analyze feedback'
        });
    }
};

module.exports = {
    submitFeedback
};