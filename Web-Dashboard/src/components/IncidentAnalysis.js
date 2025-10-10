import React, { useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { sagemakerService } from '../services/sagemaker';
import '../styles/IncidentDetails.css';

const IncidentAnalysis = ({ incident }) => {
  const { sendNotification } = useNotifications();
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [textAnalysis, setTextAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (incident && incident.fraudProbability !== undefined) {
      console.log('Setting risk analysis from incident:', incident.incidentId);
      setRiskAnalysis({
        fraudProbability: incident.fraudProbability,
        riskFactors: incident.riskFactors || [],
        isSuspicious: incident.isSuspicious || false,
        recommendation: incident.recommendation || 'PROCESS_NORMALLY',
        confidenceScore: incident.confidenceScore || 0.5,
      });
    }
  }, [incident]);

  const runRiskAnalysis = async () => {
    if (!incident) return;
    try {
      setError(null);
      console.log('Running risk analysis for incident:', incident.incidentId);
      const fraudResult = await sagemakerService.getIncidentRiskAnalysis({
        incidentId: incident.incidentId,
        description: incident.description,
        type: incident.incidentType,
        severityLevel: incident.severityLevel,
        location: incident.location,
        timestamp: incident.createdAt,
      });
      setRiskAnalysis(fraudResult);
      console.log('Risk analysis result:', fraudResult);

      if (fraudResult.isSuspicious) {
        console.log('Sending SNS notification for suspicious incident:', incident.incidentId);
        await sendNotification({
          topicArn: process.env.REACT_APP_SNS_TOPIC_ARN,
          subject: `High Risk Incident Detected: ${incident.incidentId}`,
          message: {
            incidentId: incident.incidentId,
            fraudProbability: fraudResult.fraudProbability,
            riskFactors: fraudResult.riskFactors,
            recommendation: fraudResult.recommendation,
          },
        });
      }

      // Optional: Run text analysis
      /*
      const textResult = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/ml/analyze-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: incident.description,
          type: incident.incidentType,
        }),
      }).then(res => res.json());
      console.log('Text analysis result:', textResult);
      setTextAnalysis(textResult);
      */
    } catch (err) {
      console.error('Error running analysis:', {
        message: err.message,
        response: err.response?.data,
      });
      setError('Failed to run analysis');
    }
  };

  return (
    <div className="analysis-section">
      <button onClick={runRiskAnalysis}>Re-run Risk Analysis</button>
      {error && <div className="error-message">Error: {error}</div>}
      {riskAnalysis ? (
        <div className="risk-analysis">
          <h3>Risk Analysis</h3>
          <p><strong>Fraud Probability:</strong> {(riskAnalysis.fraudProbability * 100).toFixed(2)}%</p>
          <p><strong>Confidence Score:</strong> {(riskAnalysis.confidenceScore * 100).toFixed(2)}%</p>
          <p><strong>Recommendation:</strong> {riskAnalysis.recommendation}</p>
          <p><strong>Risk Factors:</strong></p>
          <ul>
            {riskAnalysis.riskFactors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
          <p><strong>Suspicious:</strong> {riskAnalysis.isSuspicious ? 'Yes' : 'No'}</p>
        </div>
      ) : (
        <p>No risk analysis available. Click "Re-run Risk Analysis" to perform a new analysis.</p>
      )}
      {textAnalysis && (
        <div className="text-analysis">
          <h3>Text Analysis</h3>
          <p><strong>Sentiment:</strong> {textAnalysis.sentiment}</p>
          <p><strong>Suspicious Patterns:</strong></p>
          <ul>
            {textAnalysis.suspiciousPatterns.map((pattern, index) => (
              <li key={index}>{pattern}</li>
            ))}
          </ul>
          <p><strong>Entities:</strong></p>
          <ul>
            {textAnalysis.entities.map((entity, index) => (
              <li key={index}>{entity}</li>
            ))}
          </ul>
          <p><strong>Has Suspicious Content:</strong> {textAnalysis.hasSuspiciousContent ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
};

export default IncidentAnalysis;