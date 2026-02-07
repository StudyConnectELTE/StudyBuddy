import { useState, useEffect, useCallback } from "react";
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  MessageSquare, 
  Users, 
  Calendar as CalendarIcon,
  X,
  Plus,
  Mail,
  User as UserIcon,
  AlertCircle,
  Download,
  Edit2,
  Trash2
} from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
import Calendar from "./ui/calendar";
import { forumService, eventService, groupService, authService } from "../service/api";

// Toast notification
const Toast = ({ message, type = "error", onClose }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border flex items-center gap-3 max-w-sm animate-in slide-in-from-right-2 ${
    type === "error" 
      ? "bg-destructive text-destructive-foreground border-destructive" 
      : "bg-green-500 text-white border-green-500"
  }`}>
    <AlertCircle className="w-5 h-5 flex-shrink-0" />
    <span>{message}</span>
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={onClose}>
      <X className="w-4 h-4" />
    </Button>
  </div>
);

// JAVÍTOTT Post komponens - SZERKESZTÉSI/TÖRLÉSI LEHETŐSÉGGEL
const Post = ({ 
  id, 
  title,
  author, 
  content, 
  timestamp, 
  attachments, 
  authorId,
  comments, 
  showComments,
  onToggleComments,
  commentContent,
  onCommentChange,
  commentFiles,
  onAddComment,
  onAddFile,
  onRemoveFile,
  loadingComments,
  currentUser,
  editingPost,
  onEditPost,
  onSavePostEdit,
  onDeletePost,
  editingComment,
  onEditComment,
  onSaveCommentEdit,
  onDeleteComment
}) => {
  const isOwnPost = currentUser && currentUser.id === authorId;
  const isEditingThisPost = editingPost?.id === id;

  const isOwnComment = (comment) => currentUser && currentUser.id === comment.author_id;
  const isEditingThisComment = (comment) => 
    editingComment.postId === id && editingComment.commentId === comment.id;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      {/* POST HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{author}</div>
            <div className="text-xs text-muted-foreground">{timestamp}</div>
          </div>
        </div>

        {/* SAJÁT POSZT - SZERKESZTÉSI/TÖRLÉSI GOMBOK */}
        {isOwnPost && !isEditingThisPost && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditPost({ id, title: title || "", content, author_id: authorId })}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title="Szerkesztés"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeletePost(id)}
              className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive hover:text-destructive"
              title="Törlés"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* SZERKesztÉSI MÓD vagy NORMÁL NÉZET */}
      {isEditingThisPost ? (
        <div className="space-y-3 p-4 bg-secondary/50 rounded-xl border border-primary/20">
          <Input
            value={editingPost.title}
            onChange={(e) => onEditPost({ ...editingPost, title: e.target.value })}
            placeholder="Cím (opcionális)"
            className="h-10"
            autoFocus
          />
          <Textarea
            value={editingPost.content}
            onChange={(e) => onEditPost({ ...editingPost, content: e.target.value })}
            className="min-h-[100px] resize-none"
            placeholder="Szerkesztett tartalom..."
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditPost(null)}
              className="h-9 flex-1"
            >
              Mégse
            </Button>
            <Button
              size="sm"
              onClick={onSavePostEdit}
              disabled={!editingPost.content.trim()}
              className="h-9 bg-primary hover:bg-primary/90"
            >
              Mentés
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* TITLE - CSAK HA VAN */}
          {title && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <h3 className="font-semibold text-primary text-base truncate">{title}</h3>
            </div>
          )}

          {/* CONTENT */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
        </>
      )}

      {/* ATTACHMENTS */}
      {attachments?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Paperclip className="w-3 h-3" />
            Csatolt fájlok:
          </div>
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg group hover:bg-primary/10 transition-all">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Paperclip className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium truncate block">{file.filename}</span>
                  {file.size && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(file.size / 1024)} KB
                    </span>
                  )}
                </div>
              </div>
              <a
                href={`http://localhost:5000${file.file_url}`}
                target="_blank"
                rel="noopener noreferrer"
                download={file.filename}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-all font-medium group-hover:scale-105 whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                Megnézi
              </a>
            </div>
          ))}
        </div>
      )}

      {/* COMMENT TOGGLE */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggleComments(id)}
        className="w-full justify-start h-10 px-0"
        disabled={loadingComments[id]}
      >
        <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
        <span>
          {loadingComments[id] ? "Betöltés..." : `${comments?.length || 0} ${comments?.length === 1 ? 'komment' : 'kommentek'}`}
        </span>
      </Button>

      {/* COMMENTS SECTION */}
      {showComments[id] && (
        <div className="mt-4 space-y-4 pl-6 border-l-2 border-primary/20 pt-4">
          {loadingComments[id] ? (
            <div className="text-center py-6 text-muted-foreground">Kommentek betöltése...</div>
          ) : (
            <>
              {comments?.map((comment) => (
                <div key={comment.id} className="group relative">
                  {isEditingThisComment(comment) ? (
                    <div className="bg-background rounded-lg p-4 border border-primary/20">
                      <Textarea
                        value={editingComment.content}
                        onChange={(e) => onEditComment(id, { ...comment, content: e.target.value })}
                        className="min-h-[60px] resize-none mb-3"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onSaveCommentEdit}
                          disabled={!editingComment.content.trim()}
                          className="h-9 flex-1"
                        >
                          Mentés
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditComment(null)}
                          className="h-9 w-24"
                        >
                          Mégse
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-secondary/30 rounded-lg p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{comment.author}</div>
                          <div className="text-xs text-muted-foreground">{comment.timestamp}</div>
                        </div>
                      </div>
                      <p className="text-sm ml-10 whitespace-pre-wrap">{comment.content}</p>
                      
                      {/* SAJÁT KOMMENT - SZERKESZTÉSI/TÖRLÉSI GOMBOK */}
                      {isOwnComment(comment) && (
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all bg-background rounded-lg p-1 shadow-sm border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditComment(id, comment)}
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteComment(id, comment.id)}
                            className="h-7 w-7 p-0 hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* ADD COMMENT */}
              <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                <Textarea
                  placeholder="Írj egy kommentet..."
                  value={commentContent[id] || ""}
                  onChange={(e) => onCommentChange(id, e.target.value)}
                  className="mb-3 resize-none"
                  rows={2}
                />
                {(commentFiles[id] || [])?.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {(commentFiles[id] || []).map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-3 h-3 text-primary" />
                          <span className="truncate max-w-[150px]">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveFile("comment", file, id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddFile("comment", id)}
                    className="rounded-lg h-9"
                  >
                    <Paperclip className="w-3 h-3 mr-2" />
                    Csatolni
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onAddComment(id)}
                    disabled={!commentContent[id]?.trim()}
                    className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-lg"
                  >
                    Komment
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// MembersDialog
const MembersDialog = ({ groupId, members = [] }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
        <Users className="w-4 h-4 mr-2" />
        Tagok ({members.length})
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Csoport tagjai</DialogTitle>
        <DialogDescription>{members.length} tag a csoportban</DialogDescription>
      </DialogHeader>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {members.map((member, index) => (
          <div key={index} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-all">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{member.name}</span>
                {member.role === "You" && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Te</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Mail className="w-3 h-3" />
                <span className="truncate">{member.email}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

// forumpageuj.txt - CalendarDialog cseréld ki erre:
const CalendarDialog = ({ groupId, showCalendar, setShowCalendar, onEventCreated, onEventDeleted }) => {
  return showCalendar ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/95 to-blue-900/95 animate-in fade-in zoom-in duration-300">
      <div className="w-full h-full max-w-5xl max-h-5xl bg-gradient-to-br from-white via-slate-50/90 to-blue-50/80 backdrop-blur-xl shadow-2xl border border-white/20 rounded-3xl overflow-hidden flex flex-col ring-2 ring-white/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-6 flex justify-between items-center shadow-2xl border-b border-white/10 flex-shrink-0">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight drop-shadow-lg">
            📅 Csoport Naptár
          </h2>
          <button 
            onClick={() => setShowCalendar(false)} 
            className="p-2 hover:bg-white/20 rounded-2xl transition-all duration-300 hover:scale-110 backdrop-blur-sm shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Calendar közvetlenül */}
        <div className="flex-1 overflow-hidden">
          <Calendar
            open={showCalendar}
            onClose={() => setShowCalendar(false)}
            groupId={groupId}
            onEventCreated={onEventCreated}
            onEventDeleted={onEventDeleted}
          />
        </div>
      </div>
    </div>
  ) : null;
};









const ForumPage = ({ 
  groupName, 
  groupSubject, 
  groupId = 1,
  members: initialMembers = [], 
  onBack 
}) => {
  // Toast state
  const [toast, setToast] = useState(null);

  // Loading állapotok
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingComments, setLoadingComments] = useState({});
  const [creatingPost, setCreatingPost] = useState(false);
  const [creatingComment, setCreatingComment] = useState({});

  // API adatok
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState(initialMembers);
  const [currentUser, setCurrentUser] = useState(null);

  // UI állapotok
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostFiles, setNewPostFiles] = useState([]);
  const [commentContent, setCommentContent] = useState({});
  const [commentFiles, setCommentFiles] = useState({});
  const [showComments, setShowComments] = useState({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Szerkesztési állapotok
  const [editingPost, setEditingPost] = useState(null);
  const [editingComment, setEditingComment] = useState({ postId: null, commentId: null, content: "" });

  // Naptár állapotok
  const [showCalendar, setShowCalendar] = useState(false);

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  });


  // Aktuális user betöltése
  useEffect(() => {
    const user = authService.getUser();
    setCurrentUser(user);
  }, []);

  // Események betöltése oldal betöltéskor ÉS új esemény létrehozásakor
  useEffect(() => {
    const loadEvents = async () => {
      if (!groupId) return;
      try {
        const eventsData = await eventService.getEvents(groupId);
        setEvents(eventsData || []);
      } catch (error) {
        console.error("Események betöltési hiba:", error);
      }
    };
  
  loadEvents();
  }, [groupId]); // Csak groupId változásakor tölt be


  // Új esemény kezelő
  const handleEventCreated = (newEvent) => {
    setEvents(prev => [newEvent, ...prev]); // Azonnali megjelenítés
    setIsCalendarOpen(false); // Naptár bezárása
  };
  
  // Törlés handler (handleEventCreated mellé)
  const handleEventDeleted = (eventId) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };
  
  // 1. CSOPORT TAGOK BETÖLTÉSE
  useEffect(() => {
    const loadGroupMembers = async () => {
      if (!groupId) {
        showToast("Csoport azonosító hiányzik!");
        return;
      }
      try {
        const groupMembers = await groupService.getGroupMembers(groupId);
        setMembers(groupMembers);
      } catch (error) {
        console.error("Error loading group members:", error);
        showToast("Tagok betöltése sikertelen");
      }
    };
    loadGroupMembers();
  }, [groupId]);

  // 2. POSZTOK ÉS ESEMÉNYEK BETÖLTÉSE
  useEffect(() => {
    const loadForumData = async () => {
      if (!groupId) return;
      
      setLoadingPosts(true);
      setLoadingEvents(true);
      
      try {
        // Posztok
        const postsData = await forumService.getPosts(groupId);
        const postsWithAuthors = postsData.map(post => ({
          ...post,
          title: post.title,
          author: "Csoport tag",
          timestamp: new Date(post.created_at).toLocaleString('hu-HU', { 
            hour: '2-digit', 
            minute: '2-digit', 
            day: 'numeric', 
            month: 'short'
          })
        }));
        setPosts(postsWithAuthors);

        // Események
        const eventsData = await eventService.getEvents(groupId);
        const formattedEvents = eventsData.map(event => ({
          ...event,
          time: new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }));
        setEvents(formattedEvents);
      } catch (error) {
        console.error("Error loading forum data:", error);
        showToast("Adatok betöltése sikertelen");
      } finally {
        setLoadingPosts(false);
        setLoadingEvents(false);
      }
    };
    loadForumData();
  }, [groupId]);

  // 3. POST LÉTREHOZÁS
  const handleCreatePost = async () => {
    const title = newPostTitle.trim() || null;
    
    console.log("🚀 POST:", { groupId, title, contentLength: newPostContent.length, files: newPostFiles.length });
    
    if (!newPostContent.trim()) {
      showToast("A poszt tartalma nem lehet üres!");
      return;
    }
    if (!groupId) {
      showToast("Csoport azonosító hiányzik!");
      return;
    }

    setCreatingPost(true);
    try {
      const newPost = await forumService.createPost(groupId, title || "Poszt", newPostContent, newPostFiles);
      console.log("✅ POST SIKERES:", newPost);

      const updatedPosts = [{
        id: newPost.id,
        title: newPost.title,
        author: "Te",
        content: newPost.content,
        timestamp: "Épp most",
        author_id: currentUser?.id,
        comments: [],
        attachments: newPost.attachments || [],
        created_at: new Date().toISOString()
      }, ...posts];
      
      setPosts(updatedPosts);
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostFiles([]);
      showToast("Poszt sikeresen létrehozva!", "success");
    } catch (error) {
      console.error("❌ POST HIBA:", error.response?.data || error);
      showToast(`Hiba: ${error.response?.data?.error || error.message || 'Ismeretlen hiba'}`, "error");
    } finally {
      setCreatingPost(false);
    }
  };

  // POSZT SZERKesztÉS
  const handleEditPost = (postData) => {
    setEditingPost(postData);
  };

  const handleSavePostEdit = async () => {
    if (!editingPost || !currentUser) return;
    
    try {
      setCreatingPost(true);
      const updatedPost = await forumService.updatePost(
        editingPost.id, 
        editingPost.title, 
        editingPost.content
      );
      
      setPosts(posts.map(post => 
        post.id === updatedPost.id 
          ? { 
              ...updatedPost, 
              author: "Te", 
              timestamp: "Épp szerkesztve",
              author_id: currentUser.id
            }
          : post
      ));
      
      setEditingPost(null);
      showToast("Poszt sikeresen frissítve!", "success");
    } catch (error) {
      console.error("Poszt szerkesztés hiba:", error);
      showToast("Poszt frissítése sikertelen");
    } finally {
      setCreatingPost(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Biztosan törölni szeretnéd ezt a posztot?")) return;
    
    try {
      await forumService.deletePost(postId);
      setPosts(posts.filter(post => post.id !== postId));
      showToast("Poszt törölve!", "success");
    } catch (error) {
      console.error("Poszt törlés hiba:", error);
      showToast("Poszt törlése sikertelen");
    }
  };

  // KOMMENT KEZELÉSEK
  const handleToggleComments = async (postId) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    if (!showComments[postId]) {
      try {
        const commentsData = await forumService.getComments(postId);
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                comments: commentsData.map(c => ({
                  ...c,
                  author: "Csoport tag",
                  author_id: c.author_id,
                  timestamp: new Date(c.created_at).toLocaleString('hu-HU', { 
                    hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' 
                  })
                }))
              }
            : post
        ));
      } catch (error) {
        console.error("Error loading comments:", error);
        showToast("Kommentek betöltése sikertelen");
      }
    }
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    setLoadingComments(prev => ({ ...prev, [postId]: false }));
  };

  const handleAddComment = async (postId) => {
    const content = commentContent[postId];
    if (!content?.trim()) return;

    setCreatingComment(prev => ({ ...prev, [postId]: true }));
    try {
      const newComment = await forumService.createComment(postId, content, commentFiles[postId]?.[0]);
      setPosts(posts.map(post => 
        post.id === postId
          ? {
              ...post,
              comments: [...(post.comments || []), {
                id: newComment.id,
                content: newComment.content,
                author: "Te",
                author_id: currentUser?.id,
                timestamp: "Épp most"
              }]
            }
          : post
      ));
      setCommentContent(prev => ({ ...prev, [postId]: "" }));
      setCommentFiles(prev => ({ ...prev, [postId]: [] }));
      showToast("Komment elküldve!", "success");
    } catch (error) {
      console.error("Error creating comment:", error);
      showToast("Komment küldése sikertelen");
    } finally {
      setCreatingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  // KOMMENT SZERKesztÉS
  const handleEditComment = (postId, comment) => {
    setEditingComment({
      postId,
      commentId: comment.id,
      content: comment.content
    });
  };

  const handleSaveCommentEdit = async () => {
    if (!editingComment || !currentUser) return;
    
    try {
      setCreatingComment(prev => ({ ...prev, [editingComment.postId]: true }));
      const updatedComment = await forumService.updateComment(
        editingComment.commentId, 
        editingComment.content
      );
      
      setPosts(posts.map(post => {
        if (post.id === editingComment.postId && post.comments) {
          return {
            ...post,
            comments: post.comments.map(c => 
              c.id === updatedComment.id
                ? { 
                    ...updatedComment, 
                    author: "Te", 
                    timestamp: "Épp szerkesztve",
                    author_id: currentUser.id 
                  }
                : c
            )
          };
        }
        return post;
      }));
      
      setEditingComment({ postId: null, commentId: null, content: "" });
      showToast("Komment sikeresen frissítve!", "success");
    } catch (error) {
      console.error("Komment szerkesztés hiba:", error);
      showToast("Komment frissítése sikertelen");
    } finally {
      setCreatingComment(prev => ({ ...prev, [editingComment.postId]: false }));
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!confirm("Biztosan törölni szeretnéd ezt a kommentet?")) return;
    
    try {
      await forumService.deleteComment(commentId);
      setPosts(posts.map(post => 
        post.id === postId
          ? { ...post, comments: post.comments?.filter(c => c.id !== commentId) || [] }
          : post
      ));
      showToast("Komment törölve!", "success");
    } catch (error) {
      console.error("Komment törlés hiba:", error);
      showToast("Komment törlése sikertelen");
    }
  };

  const handleCommentChange = useCallback((postId, value) => {
    setCommentContent(prev => ({ ...prev, [postId]: value }));
  }, []);

  const handleAddFile = useCallback((type, postId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = type === "post";
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (type === "post") {
        setNewPostFiles(prev => [...prev, ...files]);
        showToast(`${files.length} fájl csatolva`);
      } else if (postId) {
        setCommentFiles(prev => ({ ...prev, [postId]: files.slice(0, 1) }));
        showToast("Fájl csatolva a kommenthez");
      }
    };
    input.click();
  }, []);

  const handleRemoveFile = useCallback((type, file, postId) => {
    if (type === "post") {
      setNewPostFiles(prev => prev.filter(f => f !== file));
    } else if (postId) {
      setCommentFiles(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(f => f !== file)
      }));
    }
  }, []);

  if (loadingPosts && posts.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          Fórum betöltése...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      <div className="container mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="mb-6 hover:bg-primary/10 transition-all duration-300 text-muted-foreground hover:text-foreground"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Vissza a csoportokhoz
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-2">
                {groupName}
              </h1>
              <p className="text-xl text-muted-foreground">{groupSubject}</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <MembersDialog groupId={groupId} members={members} />
              {/* Naptár gomb – EZ KELL! */}
              <Button 
                variant="outline" 
                onClick={() => setShowCalendar(true)}
                className="rounded-xl border-primary/30 hover:bg-primary/5"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Naptár
              </Button>
              <CalendarDialog 
                groupId={groupId} 
                showCalendar={showCalendar} 
                setShowCalendar={setShowCalendar}
                onEventCreated={handleEventCreated}
                onEventDeleted={handleEventDeleted}
              />

            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* MAIN FORUM */}
          <div className="lg:col-span-2 space-y-6">
            {/* CREATE POST */}
            <div className="bg-card border border-border rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
                Új poszt
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="post-title" className="text-sm font-medium">Cím (opcionális)</Label>
                  <Input
                    id="post-title"
                    placeholder="Pl: Analízis 1 házi feladat..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="mt-2 h-11"
                    disabled={creatingPost}
                  />
                </div>
                
                <div>
                  <Textarea
                    placeholder="Mi a helyzet a csoportban? Megosztanál valamit a többiekkel?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="min-h-[120px] resize-none"
                    disabled={creatingPost}
                  />
                </div>
                
                {newPostFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Csatolt fájlok:</p>
                    {newPostFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-4 h-4 text-primary" />
                          <span className="font-medium truncate max-w-[250px]">{file.name}</span>
                          <span className="text-xs text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile("post", file)}
                          className="h-8 w-8 p-0"
                          disabled={creatingPost}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleAddFile("post")}
                    className="rounded-xl h-12 flex-1 sm:flex-none"
                    disabled={creatingPost}
                  >
                    <Paperclip className="w-5 h-5 mr-2" />
                    Fájl csatolása
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim() || creatingPost}
                    className="ml-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground rounded-xl h-12 px-8 font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {creatingPost ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-2"></div>
                        Posztolás...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Poszt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* POSTS FEED */}
            <div className="space-y-6">
              {posts.map((post) => (
                <Post
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  author={post.author}
                  content={post.content}
                  timestamp={post.timestamp}
                  attachments={post.attachments}
                  authorId={post.author_id}
                  comments={post.comments || []}
                  showComments={showComments}
                  onToggleComments={handleToggleComments}
                  commentContent={commentContent}
                  onCommentChange={handleCommentChange}
                  commentFiles={commentFiles}
                  onAddComment={handleAddComment}
                  onAddFile={handleAddFile}
                  onRemoveFile={handleRemoveFile}
                  loadingComments={loadingComments}
                  currentUser={currentUser}
                  editingPost={editingPost}
                  onEditPost={handleEditPost}
                  onSavePostEdit={handleSavePostEdit}
                  onDeletePost={handleDeletePost}
                  editingComment={editingComment}
                  onEditComment={handleEditComment}
                  onSaveCommentEdit={handleSaveCommentEdit}
                  onDeleteComment={handleDeleteComment}
                />
              ))}
              {posts.length === 0 && !loadingPosts && (
                <div className="text-center py-20 text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <h3 className="text-xl font-semibold mb-2">Még nincsenek posztok</h3>
                  <p>Légy az első, oszd meg valamit a csoportoddal!</p>
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 sticky top-6 shadow-lg">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Közeledő események
              </h3>
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="p-4 bg-primary/10 border border-primary/20 rounded-xl group hover:bg-primary/20 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-1 truncate">{event.title}</div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {new Date(event.date).toLocaleDateString('hu-HU', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs font-semibold text-primary">{event.time}</div>
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-2 ml-15">{event.description}</p>
                    )}
                  </div>
                ))}
                {events.length === 0 && !loadingEvents && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Nincsenek közelgő események</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumPage;
