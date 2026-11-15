package aftershock;
import java.util.Arrays;
public final class TestRunner {
    static int checks;
    static void check(String name,boolean pass){if(!pass)throw new AssertionError(name);checks++;System.out.println("ok "+name);}
    static void near(String name,double a,double b){check(name,Math.abs(a-b)<1e-12);}
    static void rejects(String name,Runnable r){try{r.run();throw new AssertionError(name);}catch(IllegalArgumentException e){checks++;System.out.println("ok "+name);}}
    public static void main(String[] args) {
        double[] a=Statistics.acf(new double[]{1,2,3,4},3);
        near("lag zero",a[0],1);near("analytic lag1",a[1],.25);near("analytic lag2",a[2],-.3);near("analytic lag3",a[3],-.45);
        var b=Statistics.acf(new double[]{11,12,13,14},3);var c=Statistics.acf(new double[]{10,20,30,40},3);
        for(int i=0;i<4;i++){near("translation invariance "+i,a[i],b[i]);near("scale invariance "+i,a[i],c[i]);}
        near("alternating lag1",Statistics.acf(new double[]{1,-1,1,-1},1)[1],-.75);
        check("constant ACF undefined",Double.isNaN(Statistics.acf(new double[]{2,2,2},1)[1]));
        check("zero ACF undefined",Double.isNaN(Statistics.acf(new double[]{0,0,0},1)[1]));
        near("positive log return",Statistics.returns(new double[]{1,Math.E,Math.E*Math.E})[0],1);
        near("negative log return",Statistics.returns(new double[]{4,2,1})[0],Math.log(.5));
        near("absolute transform",Statistics.transform(new double[]{-2,1},"absolute")[0],2);
        near("squared transform",Statistics.transform(new double[]{-2,1},"squared")[0],4);
        near("RMS analytic",Statistics.rms(new double[]{3,4},2)[1],Math.sqrt(12.5));
        check("RMS warmup undefined",Double.isNaN(Statistics.rms(new double[]{3,4},2)[0]));
        var data=Statistics.garch(2766,42);var shuffled=Statistics.shuffle(data,991);
        check("synthetic deterministic",Arrays.equals(data,Statistics.garch(2766,42)));
        var sorted=data.clone();Arrays.sort(sorted);var sortedShuffle=shuffled.clone();Arrays.sort(sortedShuffle);
        check("shuffle preserves distribution exactly",Arrays.equals(sorted,sortedShuffle));
        check("shuffle changes ordering",!Arrays.equals(data,shuffled));
        check("shuffle deterministic",Arrays.equals(shuffled,Statistics.shuffle(data,991)));
        var abs=Statistics.acf(Statistics.transform(data,"absolute"),60);var nullAbs=Statistics.acf(Statistics.transform(shuffled,"absolute"),60);
        check("known GARCH amplitude persistence",abs[1]>.1&&abs[1]>nullAbs[1]);
        System.out.printf("Synthetic seed42 abs lag1 %.6f; shuffled %.6f%n",abs[1],nullAbs[1]);
        rejects("zero price",()->Statistics.returns(new double[]{1,0,1}));
        rejects("NaN sample",()->Statistics.acf(new double[]{1,Double.NaN},1));
        rejects("invalid lag",()->Statistics.acf(new double[]{1,2},2));
        rejects("unknown transformation",()->Statistics.transform(data,"random"));
        rejects("bad RMS window",()->Statistics.rms(data,0));
        check("extreme finite ACF",Double.isFinite(Statistics.acf(new double[]{1e300,2e300,3e300},1)[1]));
        check("tiny finite ACF",Double.isFinite(Statistics.acf(new double[]{1e-300,2e-300,3e-300},1)[1]));
        System.out.println(checks+" checks passed");
    }
}
