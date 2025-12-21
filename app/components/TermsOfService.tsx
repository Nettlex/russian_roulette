'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface TermsOfServiceProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function TermsOfService({ isOpen, onClose, onAccept }: TermsOfServiceProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
          >
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Terms of Service
            </h2>
            
            <div className="space-y-4 text-gray-300 text-sm">
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-300 font-bold mb-2">⚠️ Important Notice</p>
                <p className="text-yellow-200 text-xs">
                  This application is provided for entertainment purposes only. 
                  By using this service, you acknowledge that you understand the risks involved.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">1. Entertainment Only</h3>
                <p>
                  Russian Roulette x Base is a game built onchain for entertainment purposes. 
                  This is not a financial product, investment opportunity, or gambling service.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">2. Your Responsibility</h3>
                <p>
                  You are responsible for understanding how onchain applications work. 
                  All transactions are executed onchain and are irreversible. 
                  Only deposit amounts you can afford to lose.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">3. Age Requirement</h3>
                <p>
                  You must be at least 18 years old to use this application. 
                  By accepting these terms, you confirm you meet this requirement.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">4. Jurisdictional Compliance</h3>
                <p>
                  You are responsible for complying with your local laws and regulations. 
                  This service may not be available in all jurisdictions.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">5. No Guarantees</h3>
                <p>
                  This application is provided "as is" without any guarantees. 
                  We do not guarantee continuous availability, functionality, or specific outcomes.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">6. Smart Contract Risk</h3>
                <p>
                  All transactions interact with onchain smart contracts. 
                  While we strive for security, onchain applications carry inherent risks. 
                  You acknowledge these risks by using this service.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">7. Fair Play</h3>
                <p>
                  The game uses cryptographically verifiable randomness to ensure fairness. 
                  Each round's outcome is determined onchain and can be independently verified.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">8. Privacy</h3>
                <p>
                  We do not collect personal information. All game data is stored using your wallet address. 
                  Onchain transactions are public and permanent.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">9. Modifications</h3>
                <p>
                  We reserve the right to modify these terms at any time. 
                  Continued use of the application constitutes acceptance of updated terms.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">10. Contact</h3>
                <p>
                  This is an independent application built on Base. 
                  For questions about the application, please refer to our documentation.
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-6">
                <p className="text-blue-200 text-center text-xs">
                  By clicking "Accept & Continue", you acknowledge that you have read, 
                  understood, and agree to these Terms of Service.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
              >
                Decline
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('acceptedTerms', 'true');
                  onAccept();
                }}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
              >
                Accept & Continue
              </button>
            </div>

            <p className="text-center text-gray-500 text-xs mt-4">
              Last updated: December 21, 2025
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

