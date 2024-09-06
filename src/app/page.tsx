"use client"
import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase-config'; // Adjust the path if necessary

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
    <tr className="border-b">
      <td className="py-2 px-4 w-16">
        <TokenLogo src={token.logoURI} alt={`${token.name} logo`} />
      </td>
      <td className="py-2 px-4">
        <div>{token.name}</div>
        <a
          href={`https://birdeye.so/token/${token.address}?chain=solana`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          {token.address.slice(0, 4)}...{token.address.slice(-4)}
        </a>
      </td>
      <td className="py-2 px-4 text-center">
        <button 
          onClick={() => onLike(token.address)} 
          className="bg-green-500 text-white px-2 py-1 rounded mr-2"
        >
          Like ({token.likes})
        </button>
        <button 
          onClick={() => onDislike(token.address)} 
          className="bg-red-500 text-white px-2 py-1 rounded"
        >
          Dislike ({token.dislikes})
        </button>
      </td>
    </tr>
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
    <div className="min-h-screen p-8 font-sans flex flex-col">
      <footer className="absolute top-4 right-4 text-right text-sm text-gray-600 max-w-xs">
        <p>
          Open source on {' '}
          <a 
            href="https://github.com/vulalabs/memecoinvote.git" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            GitHub
          </a>
          .
        </p>
      </footer>

      <main className="max-w-4xl mx-auto flex-grow">
        <h1 className="text-3xl text-center font-bold mb-6">Solana Token List</h1>
        <p className="mb-4 text-sm text-gray-600">
          Like or dislike tokens to share your opinion!
        </p>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or address"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <p>Loading...</p>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="py-2 px-4 text-left">Logo</th>
                  <th className="py-2 px-4 text-left">Token Name & Address</th>
                  <th className="py-2 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTokens.map((token) => (
                  <TokenRow 
                    key={token.address} 
                    token={token} 
                    onLike={handleLike} 
                    onDislike={handleDislike}
                  />
                ))}
              </tbody>
            </table>
            {filteredAndSortedTokens.length === 0 && (
              <p className="text-center mt-4 text-gray-600">No tokens found matching your search.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
