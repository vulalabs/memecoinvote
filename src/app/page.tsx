"use client"
import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase-config'; // Adjust the path if necessary
import { Github } from 'lucide-react';

interface JupiterToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  tags: string[];
  daily_volume: number;
  freeze_authority: string | null;
  mint_authority: string | null;
}

interface FirebaseData {
  likes: number;
  dislikes: number;
}

interface Token extends JupiterToken {
  likes: number;
  dislikes: number;
}

interface TokenRowProps {
  token: Token;
  onLike: (address: string) => void;
  onDislike: (address: string) => void;
}

const TokenLogo: React.FC<{ src: string, alt: string }> = ({ src, alt }) => {
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
  };

  if (error) {
    return <img src={`https://placehold.co/800`} alt={alt} className="w-8 h-8 rounded-full" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      className="w-8 h-8 rounded-full"
    />
  );
};

const TokenRow: React.FC<TokenRowProps> = ({ token, onLike, onDislike }) => {
  return (
    <div className="flex items-center p-4 border-b">
      <TokenLogo src={token.logoURI} alt={`${token.name} logo`} />
      <div className="ml-4 flex-grow">
        <div className="font-semibold">{token.name}</div>
        <a
          href={`https://birdeye.so/token/${token.address}?chain=solana`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          {token.address.slice(0, 4)}...{token.address.slice(-4)}
        </a>
      </div>
      <div className="flex space-x-2">
        <button 
          onClick={() => onLike(token.address)} 
          className="bg-green-500 text-white px-3 py-1 rounded-full text-sm"
        >
          👍 {token.likes}
        </button>
        <button 
          onClick={() => onDislike(token.address)} 
          className="bg-red-500 text-white px-3 py-1 rounded-full text-sm"
        >
          👎 {token.dislikes}
        </button>
      </div>
    </div>
  );
};

export default function Home() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJupiterTokens = async () => {
      try {
        console.log("Fetching Jupiter tokens...");
        const response = await fetch('https://tokens.jup.ag/tokens?tags=lst,community');
        console.log(response)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: JupiterToken[] = await response.json();
        console.log(`Fetched ${data.length} Jupiter tokens`);
        return data;
      } catch (error) {
        console.error('Error fetching Jupiter tokens:', error);
        return [];
      }
    };
  
    const tokensCollection = collection(db, 'coins');
    
    const unsubscribe = onSnapshot(tokensCollection, async (snapshot) => {
      try {
        console.log("Firestore snapshot received");
        const firebaseData: Record<string, FirebaseData> = {};
        snapshot.docs.forEach(doc => {
          firebaseData[doc.id] = doc.data() as FirebaseData;
        });
        console.log("Firebase data:", firebaseData);
  
        const jupiterTokens = await fetchJupiterTokens();
  
        if (jupiterTokens.length === 0) {
          console.warn("No Jupiter tokens fetched, but continuing...");
        }
  
        const combinedTokens: Token[] = jupiterTokens.map(jToken => ({
          ...jToken,
          likes: firebaseData[jToken.address]?.likes || 0,
          dislikes: firebaseData[jToken.address]?.dislikes || 0
        }));
  
        console.log(`Combined ${combinedTokens.length} tokens`);
        setTokens(combinedTokens);
        setIsLoading(false);
      } catch (error) {
        console.error("Error in Firestore onSnapshot callback:", error);
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setIsLoading(false);
    });
  
    return () => {
      unsubscribe();
    };
  }, []);

  const handleLike = async (address: string) => {
    const tokenRef = doc(db, 'coins', address);
    await setDoc(tokenRef, {
      likes: increment(1)
    }, { merge: true });
  };

  const handleDislike = async (address: string) => {
    const tokenRef = doc(db, 'coins', address);
    await setDoc(tokenRef, {
      dislikes: increment(1)
    }, { merge: true });
  };

  const filteredAndSortedTokens = tokens
    .filter(token => 
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      token.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.likes - a.likes);

  return (
    <div className="min-h-screen p-4 font-sans flex flex-col">
      <main className="max-w-lg mx-auto w-full flex-grow">
        <h1 className="text-2xl font-bold mb-4 text-center">Solana Token List</h1>
        <p className="mb-4 text-sm text-gray-600 flex items-center justify-center">
          Like or dislike tokens to share your opinion! 
          <a 
            href="https://github.com/vulalabs/memecoinvote.git" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 text-blue-500 hover:text-blue-600"
          >
            <Github size={16} />
          </a>
        </p>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or address"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <p>Loading...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredAndSortedTokens.map((token) => (
              <TokenRow 
                key={token.address} 
                token={token} 
                onLike={handleLike} 
                onDislike={handleDislike}
              />
            ))}
            {filteredAndSortedTokens.length === 0 && (
              <p className="text-center py-4 text-gray-600">No tokens found matching your search.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
